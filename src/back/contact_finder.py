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

ROLE_DEPARTMENT_MAP = {
    "engineer": "it",
    "engineering": "it",
    "developer": "it",
    "swe": "it",
    "sales": "sales",
    "marketing": "marketing",
    "product": "management",
}


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


def _department_for_role(role_title: str) -> str | None:
    role_lower = (role_title or "").lower()
    for keyword, department in ROLE_DEPARTMENT_MAP.items():
        if keyword in role_lower:
            return department
    return None


def _rank_and_enrich(raw: list[dict], company_domain: str, limit: int) -> list[dict]:
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


def find_contacts(company_domain: str, role_title: str = "", limit: int = 5) -> list[dict]:
    raw = domain_search(company_domain, limit=30, department="hr")

    if not raw:
        role_department = _department_for_role(role_title)
        if role_department:
            raw = domain_search(company_domain, limit=30, department=role_department)

    if not raw:
        raw = domain_search(company_domain, limit=30)

    if not raw:
        return []

    return _rank_and_enrich(raw, company_domain, limit)


def find_contacts_by_department(company_domain: str, department: str, limit: int = 5) -> list[dict]:
    """Look up contacts in a single, user-chosen Hunter department (e.g. when
    the auto-selected tier didn't surface the kind of person the user wants).
    Returns [] if Hunter has nothing tagged under that department — the
    caller decides how to message that to the user."""
    raw = domain_search(company_domain, limit=30, department=department)
    if not raw:
        return []
    return _rank_and_enrich(raw, company_domain, limit)
