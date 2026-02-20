import sqlite3
import os
from typing import Any

DB_PATH = os.path.join(os.path.dirname(__file__), "emails.db")


def _get_connection() -> sqlite3.Connection:
    """Return a connection with row_factory set so rows come back as dicts."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def _init_db() -> None:
    """Create the emails table if it doesn't already exist."""
    with _get_connection() as conn:
        conn.execute("""
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
            )
        """)
        conn.commit()


# Initialise the database as soon as this module is imported.
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
    """
    Insert a new email record and return its auto-assigned row id.

    Args:
        to_name:  Recipient's full name.
        to_email: Recipient's email address.
        company:  Recipient's company name.
        role:     Recipient's job role / title.
        subject:  Email subject line.
        body:     Email body text.
        status:   'sent' or 'failed'.

    Returns:
        The integer id of the newly inserted row.
    """
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
    """
    Fetch every row from the emails table.

    Returns:
        A list of dicts, one per row, with column names as keys.
    """
    with _get_connection() as conn:
        rows = conn.execute("SELECT * FROM emails ORDER BY sent_at DESC").fetchall()
        return [dict(row) for row in rows]


if __name__ == "__main__":
    # Insert one test record.
    new_id = insert_email(
        to_name="Jane Smith",
        to_email="jane@example.com",
        company="Acme Corp",
        role="Head of Engineering",
        subject="Quick intro — let's connect",
        body="Hi Jane,\n\nI came across Acme Corp and was impressed by your work...\n\nBest,\nSameep",
        status="sent",
    )
    print(f"[db] Inserted test record with id={new_id}\n")

    # Print all records to verify.
    records = get_all_emails()
    print(f"[db] Total records in emails table: {len(records)}\n")
    for record in records:
        print(record)
