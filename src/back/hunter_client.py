import os
import logging
import httpx

logger = logging.getLogger(__name__)

HUNTER_BASE = "https://api.hunter.io/v2"
CONFIDENCE_OK = 85
CONFIDENCE_WARN = 50
PLAN_LIMIT_FALLBACK = 10


def _api_key() -> str:
    key = os.getenv("HUNTER_API_KEY", "")
    if not key:
        raise RuntimeError("HUNTER_API_KEY is not set")
    return key


def _hunter_error_detail(response: httpx.Response) -> str:
    try:
        errors = response.json().get("errors") or []
        if errors:
            return errors[0].get("details") or errors[0].get("code") or str(errors[0])
    except Exception:
        pass
    return response.text or f"HTTP {response.status_code}"


def _is_plan_limit_error(detail: str) -> bool:
    detail_lower = detail.lower()
    return "plan" in detail_lower or "limited to" in detail_lower


def apply_email_confidence(email: str, confidence: int) -> tuple[str, str]:
    """Returns (email, status) where status is ok | warning | blank."""
    if not email:
        return "", "blank"
    if confidence >= CONFIDENCE_OK:
        return email, "ok"
    if confidence >= CONFIDENCE_WARN:
        return email, "warning"
    return "", "blank"


def _domain_search_request(domain: str, limit: int, department: str | None) -> dict:
    params = {
        "domain": domain,
        "api_key": _api_key(),
        "limit": limit,
    }
    if department:
        params["department"] = department
    with httpx.Client(timeout=30.0) as client:
        response = client.get(f"{HUNTER_BASE}/domain-search", params=params)
        response.raise_for_status()
        return response.json().get("data", {})


def domain_search(domain: str, limit: int = 10, department: str | None = None) -> list[dict]:
    if not domain:
        return []

    try:
        data = _domain_search_request(domain, limit, department)
    except httpx.HTTPStatusError as e:
        detail = _hunter_error_detail(e.response)
        if (
            e.response.status_code == 400
            and limit > PLAN_LIMIT_FALLBACK
            and _is_plan_limit_error(detail)
        ):
            logger.warning(
                "Hunter domain search for %s hit a plan limit (%s); retrying with limit=%d",
                domain, detail, PLAN_LIMIT_FALLBACK,
            )
            try:
                data = _domain_search_request(domain, PLAN_LIMIT_FALLBACK, department)
            except httpx.HTTPStatusError as e2:
                detail2 = _hunter_error_detail(e2.response)
                logger.warning("Hunter domain search retry failed for %s: %s", domain, detail2)
                raise RuntimeError(f"Hunter API error: {detail2}") from e2
        else:
            logger.warning("Hunter domain search failed for %s: %s", domain, detail)
            raise RuntimeError(f"Hunter API error: {detail}") from e
    except Exception as e:
        logger.warning("Hunter domain search failed for %s: %s", domain, e)
        raise RuntimeError(f"Hunter API error: {e}") from e

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
