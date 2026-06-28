import json
import sqlite3
import os
from datetime import datetime, timezone
from typing import Any, Optional

DB_PATH = os.path.join(os.path.dirname(__file__), "emails.db")


def _get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db() -> None:
    with _get_connection() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS emails (
                id       INTEGER PRIMARY KEY AUTOINCREMENT,
                to_name  TEXT    NOT NULL,
                to_email TEXT    NOT NULL,
                company  TEXT    NOT NULL,
                role     TEXT    NOT NULL,
                subject  TEXT    NOT NULL,
                body     TEXT    NOT NULL,
                status   TEXT    NOT NULL CHECK(status IN ('sent', 'failed')),
                sent_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS user_profile (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                resume_text TEXT,
                resume_filename TEXT,
                linkedin TEXT,
                github TEXT,
                sign_off TEXT DEFAULT 'Best regards',
                updated_at TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS applications (
                id TEXT PRIMARY KEY,
                company TEXT,
                role TEXT,
                job_url TEXT,
                jd_summary TEXT,
                raw_jd_text TEXT,
                agent_state TEXT,
                status TEXT DEFAULT 'awaiting_contacts',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS application_contacts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                application_id TEXT NOT NULL,
                name TEXT NOT NULL,
                role TEXT,
                email TEXT,
                confidence INTEGER DEFAULT 0,
                reason TEXT,
                draft_subject TEXT,
                draft_body TEXT,
                generation_status TEXT DEFAULT 'pending',
                gmail_draft_id TEXT,
                status TEXT,
                FOREIGN KEY (application_id) REFERENCES applications(id)
            );

            CREATE TABLE IF NOT EXISTS search_cache (
                query TEXT PRIMARY KEY,
                results TEXT NOT NULL,
                fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS gmail_tokens (
                user_id TEXT PRIMARY KEY DEFAULT 'default',
                token_json TEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        conn.commit()


_init_db()


def insert_email(
    to_name: str,
    to_email: str,
    company: str,
    role: str,
    subject: str,
    body: str,
    status: str,
) -> int:
    with _get_connection() as conn:
        cursor = conn.execute(
            """
            INSERT INTO emails (to_name, to_email, company, role, subject, body, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (to_name, to_email, company, role, subject, body, status),
        )
        conn.commit()
        return cursor.lastrowid


def get_all_emails() -> list[dict[str, Any]]:
    with _get_connection() as conn:
        rows = conn.execute("SELECT * FROM emails ORDER BY sent_at DESC").fetchall()
        return [dict(row) for row in rows]


def get_user_profile() -> Optional[dict[str, Any]]:
    with _get_connection() as conn:
        row = conn.execute("SELECT * FROM user_profile WHERE id = 1").fetchone()
        return dict(row) if row else None


def upsert_user_profile(
    resume_text: str = "",
    resume_filename: str = "",
    linkedin: str = "",
    github: str = "",
    sign_off: str = "Best regards",
) -> dict[str, Any]:
    now = datetime.now(timezone.utc).isoformat()
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO user_profile (id, resume_text, resume_filename, linkedin, github, sign_off, updated_at)
            VALUES (1, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                resume_text = excluded.resume_text,
                resume_filename = excluded.resume_filename,
                linkedin = excluded.linkedin,
                github = excluded.github,
                sign_off = excluded.sign_off,
                updated_at = excluded.updated_at
            """,
            (resume_text, resume_filename, linkedin, github, sign_off, now),
        )
        conn.commit()
    return get_user_profile() or {}


def create_application(
    application_id: str,
    company: str,
    role: str,
    job_url: str,
    jd_summary: str,
    raw_jd_text: str,
    agent_state: dict,
    status: str = "awaiting_contacts",
) -> dict[str, Any]:
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO applications (id, company, role, job_url, jd_summary, raw_jd_text, agent_state, status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                application_id,
                company,
                role,
                job_url,
                jd_summary,
                raw_jd_text,
                json.dumps(agent_state),
                status,
            ),
        )
        conn.commit()
    return get_application(application_id)


def update_application_state(application_id: str, agent_state: dict, status: str) -> None:
    with _get_connection() as conn:
        conn.execute(
            """
            UPDATE applications SET agent_state = ?, status = ? WHERE id = ?
            """,
            (json.dumps(agent_state), status, application_id),
        )
        conn.commit()


def get_application(application_id: str) -> Optional[dict[str, Any]]:
    with _get_connection() as conn:
        row = conn.execute("SELECT * FROM applications WHERE id = ?", (application_id,)).fetchone()
        if not row:
            return None
        data = dict(row)
        if data.get("agent_state"):
            data["agent_state"] = json.loads(data["agent_state"])
        return data


def save_application_contacts(application_id: str, contacts: list[dict]) -> list[dict]:
    with _get_connection() as conn:
        conn.execute("DELETE FROM application_contacts WHERE application_id = ?", (application_id,))
        saved = []
        for c in contacts:
            cursor = conn.execute(
                """
                INSERT INTO application_contacts
                (application_id, name, role, email, confidence, reason, generation_status)
                VALUES (?, ?, ?, ?, ?, ?, 'pending')
                """,
                (
                    application_id,
                    c.get("name", ""),
                    c.get("role", ""),
                    c.get("email", ""),
                    c.get("confidence", 0),
                    c.get("reason", ""),
                ),
            )
            saved.append({**c, "id": cursor.lastrowid})
        conn.commit()
    return saved


def get_application_contacts(application_id: str) -> list[dict[str, Any]]:
    with _get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM application_contacts WHERE application_id = ? ORDER BY id",
            (application_id,),
        ).fetchall()
        return [dict(row) for row in rows]


def update_contact_draft(
    contact_id: int,
    subject: str,
    body: str,
    generation_status: str,
    gmail_draft_id: str = "",
) -> None:
    with _get_connection() as conn:
        conn.execute(
            """
            UPDATE application_contacts
            SET draft_subject = ?, draft_body = ?, generation_status = ?, gmail_draft_id = ?
            WHERE id = ?
            """,
            (subject, body, generation_status, gmail_draft_id, contact_id),
        )
        conn.commit()


def get_search_cache(query: str) -> Optional[list[str]]:
    with _get_connection() as conn:
        row = conn.execute("SELECT results FROM search_cache WHERE query = ?", (query,)).fetchone()
        if not row:
            return None
        return json.loads(row["results"])


def set_search_cache(query: str, results: list[str]) -> None:
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO search_cache (query, results, fetched_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(query) DO UPDATE SET results = excluded.results, fetched_at = CURRENT_TIMESTAMP
            """,
            (query, json.dumps(results)),
        )
        conn.commit()


def save_gmail_token(user_id: str, token_json: str) -> None:
    with _get_connection() as conn:
        conn.execute(
            """
            INSERT INTO gmail_tokens (user_id, token_json, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(user_id) DO UPDATE SET token_json = excluded.token_json, updated_at = CURRENT_TIMESTAMP
            """,
            (user_id, token_json),
        )
        conn.commit()


def get_gmail_token(user_id: str = "default") -> Optional[str]:
    with _get_connection() as conn:
        row = conn.execute("SELECT token_json FROM gmail_tokens WHERE user_id = ?", (user_id,)).fetchone()
        return row["token_json"] if row else None
