"""Anonymous, ephemeral, in-memory per-visitor session store.

Nothing here ever touches disk: no resume text, no Gmail token, no job/contact
data is written to SQLite. Everything lives in this process's RAM for as long
as a visitor is active, and disappears on server restart or after
SESSION_TTL_SECONDS of inactivity. This is deliberate — see the plan doc for
why (leak-risk minimization, not a technical shortcut).
"""
import secrets
import time
from datetime import date
from typing import Any, Optional

SESSION_TTL_SECONDS = 6 * 3600  # expire after 6h idle
DAILY_LIMIT = 10  # /agent/run + /gmail/create-drafts calls per session per day

_SESSIONS: dict[str, dict[str, Any]] = {}


def _new_session() -> dict[str, Any]:
    return {
        "created": time.time(),
        "last_seen": time.time(),
        "gmail_creds": None,
        "applications": {},
        "usage_day": date.today().isoformat(),
        "usage_count": 0,
    }


def new_session_id() -> str:
    return secrets.token_urlsafe(32)


def get_session(session_id: Optional[str]) -> Optional[dict[str, Any]]:
    if not session_id or session_id not in _SESSIONS:
        return None
    s = _SESSIONS[session_id]
    if time.time() - s["last_seen"] > SESSION_TTL_SECONDS:
        del _SESSIONS[session_id]
        return None
    s["last_seen"] = time.time()
    return s


def get_or_create_session(session_id: Optional[str]) -> tuple[str, dict[str, Any]]:
    s = get_session(session_id)
    if s is not None:
        return session_id, s
    new_id = new_session_id()
    _SESSIONS[new_id] = _new_session()
    return new_id, _SESSIONS[new_id]


def check_and_increment_usage(session: dict[str, Any]) -> None:
    today = date.today().isoformat()
    if session.get("usage_day") != today:
        session["usage_day"] = today
        session["usage_count"] = 0
    if session["usage_count"] >= DAILY_LIMIT:
        raise RateLimitExceeded(f"Daily limit of {DAILY_LIMIT} requests reached, try again tomorrow.")
    session["usage_count"] += 1


class RateLimitExceeded(Exception):
    pass


# ---- Per-application pipeline state (replaces db.py's applications /
# application_contacts tables) ----

def create_application(
    session: dict[str, Any],
    application_id: str,
    company: str,
    role: str,
    job_url: str,
    jd_summary: str,
    raw_jd_text: str,
    agent_state: dict,
    status: str = "awaiting_contacts",
) -> dict[str, Any]:
    record = {
        "id": application_id,
        "company": company,
        "role": role,
        "job_url": job_url,
        "jd_summary": jd_summary,
        "raw_jd_text": raw_jd_text,
        "agent_state": agent_state,
        "status": status,
        "contacts": {},
        "next_contact_id": 1,
    }
    session["applications"][application_id] = record
    return record


def get_application(session: dict[str, Any], application_id: str) -> Optional[dict[str, Any]]:
    return session["applications"].get(application_id)


def update_application_state(session: dict[str, Any], application_id: str, agent_state: dict, status: str) -> None:
    app = session["applications"].get(application_id)
    if app is not None:
        app["agent_state"] = agent_state
        app["status"] = status


def save_application_contacts(session: dict[str, Any], application_id: str, contacts: list[dict]) -> list[dict]:
    app = session["applications"][application_id]
    app["contacts"] = {}
    saved = []
    for c in contacts:
        cid = app["next_contact_id"]
        app["next_contact_id"] += 1
        record = {
            **c,
            "id": cid,
            "draft_subject": "",
            "draft_body": "",
            "generation_status": "pending",
            "gmail_draft_id": "",
        }
        app["contacts"][cid] = record
        saved.append(record)
    return saved


def get_application_contacts(session: dict[str, Any], application_id: str) -> list[dict[str, Any]]:
    app = session["applications"].get(application_id, {})
    return list(app.get("contacts", {}).values())


def update_contact_draft(
    session: dict[str, Any],
    application_id: str,
    contact_id: int,
    subject: str,
    body: str,
    generation_status: str,
    gmail_draft_id: str = "",
) -> None:
    app = session["applications"].get(application_id)
    if app is None:
        return
    contact = app["contacts"].get(contact_id)
    if contact is None:
        return
    contact["draft_subject"] = subject
    contact["draft_body"] = body
    contact["generation_status"] = generation_status
    contact["gmail_draft_id"] = gmail_draft_id
