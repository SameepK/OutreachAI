import os
import logging
import httpx

logger = logging.getLogger(__name__)

HUNTER_BASE = "https://api.hunter.io/v2"
CONFIDENCE_OK = 85
CONFIDENCE_WARN = 50


def _api_key() -> str:
    key = os.getenv("HUNTER_API_KEY", "")
    if not key:
        raise RuntimeError("HUNTER_API_KEY is not set")
    return key


def apply_email_confidence(email: str, confidence: int) -> tuple[str, str]:
    """Returns (email, status) where status is ok | warning | blank."""
    if not email:
        return "", "blank"
    if confidence >= CONFIDENCE_OK:
        return email, "ok"
    if confidence >= CONFIDENCE_WARN:
        return email, "warning"
    return "", "blank"


def domain_search(domain: str, limit: int = 20) -> list[dict]:
    if not domain:
        return []

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(
                f"{HUNTER_BASE}/domain-search",
                params={
                    "domain": domain,
                    "api_key": _api_key(),
                    "limit": limit,
                },
            )
            response.raise_for_status()
            data = response.json().get("data", {})
    except Exception as e:
        logger.warning("Hunter domain search failed for %s: %s", domain, e)
        return []

    contacts = []
    for person in data.get("emails", []):
        first = person.get("first_name") or ""
        last = person.get("last_name") or ""
        name = f"{first} {last}".strip()
        raw_email = person.get("value") or ""
        confidence = int(person.get("confidence") or 0)
        email, email_status = apply_email_confidence(raw_email, confidence)
        contacts.append(
            {
                "name": name,
                "role": person.get("position") or "",
                "email": email,
                "raw_email": raw_email,
                "confidence": confidence,
                "email_status": email_status,
                "source": "hunter_domain_search",
            }
        )
    return contacts


def email_finder(domain: str, first_name: str, last_name: str) -> dict:
    if not domain or not first_name:
        return {"email": "", "confidence": 0, "email_status": "blank"}

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.get(
                f"{HUNTER_BASE}/email-finder",
                params={
                    "domain": domain,
                    "first_name": first_name,
                    "last_name": last_name,
                    "api_key": _api_key(),
                },
            )
            response.raise_for_status()
            data = response.json().get("data", {})
    except Exception as e:
        logger.warning("Hunter email finder failed: %s", e)
        return {"email": "", "confidence": 0, "email_status": "blank"}

    raw_email = data.get("email") or ""
    confidence = int(data.get("score") or 0)
    email, email_status = apply_email_confidence(raw_email, confidence)
    return {
        "email": email,
        "raw_email": raw_email,
        "confidence": confidence,
        "email_status": email_status,
    }


def enrich_contact_email(contact: dict, domain: str) -> dict:
    if contact.get("email"):
        return contact

    name_parts = (contact.get("name") or "").split()
    if len(name_parts) < 1:
        return contact

    first = name_parts[0]
    last = name_parts[-1] if len(name_parts) > 1 else ""
    found = email_finder(domain, first, last)
    if found.get("email") or found.get("raw_email"):
        contact = {**contact, **found}
        if not contact.get("email") and found.get("raw_email"):
            contact["email"] = found["raw_email"]
    return contact
