from hunter_client import domain_search, enrich_contact_email

PRIORITY_TITLES = [
    "recruiter",
    "talent",
    "talent acquisition",
    "engineering manager",
    "tech lead",
    "head of engineering",
    "vp engineering",
    "director of engineering",
    "hiring manager",
]


def score_contact(title: str) -> int:
    title_lower = (title or "").lower()
    for i, keyword in enumerate(PRIORITY_TITLES):
        if keyword in title_lower:
            return len(PRIORITY_TITLES) - i
    return 0


def _reason_for_contact(title: str, score: int) -> str:
    if score > 0:
        return f"Relevant title match for outreach: {title}"
    return f"Found at company via domain search: {title or 'unknown role'}"


def find_contacts(company_domain: str, limit: int = 5) -> list[dict]:
    raw = domain_search(company_domain, limit=30)
    if not raw:
        return []

    for contact in raw:
        contact["score"] = score_contact(contact.get("role", ""))
        contact["reason"] = _reason_for_contact(contact.get("role", ""), contact["score"])

    ranked = sorted(raw, key=lambda c: (c["score"], c.get("confidence", 0)), reverse=True)

    seen_names: set[str] = set()
    results: list[dict] = []
    for contact in ranked:
        name_key = (contact.get("name") or "").lower()
        if not name_key or name_key in seen_names:
            continue
        seen_names.add(name_key)
        enriched = enrich_contact_email(contact, company_domain)
        results.append(enriched)
        if len(results) >= limit:
            break

    return results
