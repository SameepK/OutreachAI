import base64
import logging
import re
from email.mime.text import MIMEText
from typing import Any

from googleapiclient.discovery import build

from gmail_auth import get_credentials

logger = logging.getLogger(__name__)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _build_service(session: dict[str, Any]):
    creds = get_credentials(session)
    if not creds:
        raise RuntimeError("Gmail not connected. Complete OAuth first.")
    return build("gmail", "v1", credentials=creds)


def _get_authenticated_email(session: dict[str, Any]) -> str:
    """Return the Gmail address actually connected via OAuth, or "" if it
    can't be determined (not connected, API error, etc.)."""
    try:
        service = _build_service(session)
        profile = service.users().getProfile(userId="me").execute()
        return profile.get("emailAddress", "")
    except Exception as e:
        logger.warning("Could not fetch authenticated Gmail address: %s", e)
        return ""


def create_draft(session: dict[str, Any], to_email: str, subject: str, body: str) -> str:
    message = MIMEText(body)
    message["to"] = to_email
    message["subject"] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    service = _build_service(session)
    draft = (
        service.users()
        .drafts()
        .create(userId="me", body={"message": {"raw": raw}})
        .execute()
    )
    return draft.get("id", "")


def create_drafts(session: dict[str, Any], drafts: list[dict]) -> dict:
    created = []
    errors = []
    own_email = _get_authenticated_email(session)

    for d in drafts:
        to_email = d.get("to_email") or d.get("email")
        if not to_email:
            errors.append({"contact_id": d.get("contact_id"), "error": "Missing email"})
            continue
        if not _EMAIL_RE.match(to_email):
            errors.append({"contact_id": d.get("contact_id"), "error": f"Invalid email format: {to_email}"})
            continue
        if own_email and to_email.strip().lower() == own_email.strip().lower():
            errors.append({
                "contact_id": d.get("contact_id"),
                "error": f"Refusing to draft an email to yourself ({to_email})",
            })
            continue
        try:
            draft_id = create_draft(session, to_email, d.get("subject", ""), d.get("body", ""))
            created.append({
                "contact_id": d.get("contact_id"),
                "draft_id": draft_id,
                "to_email": to_email,
            })
        except Exception as e:
            logger.exception("Failed to create draft for %s", to_email)
            errors.append({"contact_id": d.get("contact_id"), "error": str(e)})

    return {
        "draft_ids": [c["draft_id"] for c in created],
        "created": created,
        "errors": errors,
        "gmail_url": "https://mail.google.com/mail/u/0/#drafts",
    }
