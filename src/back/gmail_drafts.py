import base64
import logging
from email.mime.text import MIMEText

from googleapiclient.discovery import build

from gmail_auth import get_credentials

logger = logging.getLogger(__name__)


def _build_service():
    creds = get_credentials()
    if not creds:
        raise RuntimeError("Gmail not connected. Complete OAuth first.")
    return build("gmail", "v1", credentials=creds)


def create_draft(to_email: str, subject: str, body: str) -> str:
    message = MIMEText(body)
    message["to"] = to_email
    message["subject"] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes()).decode("utf-8")

    service = _build_service()
    draft = (
        service.users()
        .drafts()
        .create(userId="me", body={"message": {"raw": raw}})
        .execute()
    )
    return draft.get("id", "")


def create_drafts(drafts: list[dict]) -> dict:
    created = []
    errors = []
    for d in drafts:
        to_email = d.get("to_email") or d.get("email")
        if not to_email:
            errors.append({"contact_id": d.get("contact_id"), "error": "Missing email"})
            continue
        try:
            draft_id = create_draft(to_email, d.get("subject", ""), d.get("body", ""))
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
