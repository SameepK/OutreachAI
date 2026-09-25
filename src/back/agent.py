import asyncio
import json
import logging
import uuid
from typing import AsyncGenerator

from jd_scraper import fetch_jd_text
from jd_parser import parse_jd
from company_scraper import scrape_company_pages, scrape_github_org
from contact_finder import find_contacts
from hunter_client import email_finder
from web_search import (
    search_company_signals,
    search_person_signals,
    summarize_public_signals,
)
from generator import generate_email
from db import (
    create_application,
    update_application_state,
    get_application,
    save_application_contacts,
    get_application_contacts,
    update_contact_draft,
)

logger = logging.getLogger(__name__)

_playwright_warning_logged = False


PERSONAL_EMAIL_DOMAINS = {
    "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
    "icloud.com", "aol.com", "protonmail.com", "live.com", "me.com",
}


def _is_unverified_contact(contact: dict) -> bool:
    """True when a contact has no Hunter confidence score AND a personal
    email domain — a strong, deterministic signal this was manually typed
    in rather than sourced from the company's real domain, independent of
    whatever Perplexity's employment-verification research concludes."""
    confidence = contact.get("confidence", 0) or 0
    email = (contact.get("email") or "").strip().lower()
    domain = email.split("@")[-1] if "@" in email else ""
    return confidence == 0 and domain in PERSONAL_EMAIL_DOMAINS


def _try_find_email(company_domain: str, name: str) -> dict:
    """Best-effort Hunter.io email-finder lookup by name when a contact has
    no email on file. Never raises — returns a blank result on no match."""
    name_parts = (name or "").split()
    if not company_domain or not name_parts:
        return {"email": "", "confidence": 0, "email_status": "blank"}
    first = name_parts[0]
    last = name_parts[-1] if len(name_parts) > 1 else ""
    return email_finder(company_domain, first, last)


def _tag_company_signals(company_pages: dict, company_ddg: list) -> dict[str, str]:
    """Tag company_pages (static/about-us content) and company_ddg (fresh
    web search results) distinctly so the downstream prompt can tell generic
    company info apart from specific, recent signals."""
    generic = "\n".join(v for v in company_pages.values() if v)
    specific = "\n".join(company_ddg[:5])
    return {
        "GENERIC_COMPANY_INFO": generic,
        "SPECIFIC_RECENT_SIGNAL": specific,
    }


async def check_playwright_installed() -> bool:
    try:
        from playwright.async_api import async_playwright

        async with async_playwright() as p:
            return p.chromium is not None
    except Exception:
        return False


async def warn_playwright_if_missing() -> str | None:
    global _playwright_warning_logged
    if await check_playwright_installed():
        return None
    msg = (
        "Playwright Chromium is not installed. JS-heavy job pages may fail. "
        "Run: playwright install chromium (~150MB)"
    )
    if not _playwright_warning_logged:
        logger.warning(msg)
        _playwright_warning_logged = True
    return msg


async def _emit(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


async def run_agent_phase_one(
    jd_text: str | None,
    jd_url: str | None,
    resume_text: str,
    user_context: str = "",
    linkedin: str = "",
    github: str = "",
    sign_off: str = "Best regards",
) -> AsyncGenerator[str, None]:
    application_id = str(uuid.uuid4())

    pw_warning = await warn_playwright_if_missing()
    if pw_warning:
        yield await _emit({"type": "warning", "message": pw_warning})

    yield await _emit({"type": "step", "step": 1, "message": "Fetching job description..."})

    raw_jd_text = (jd_text or "").strip()
    if jd_url and not raw_jd_text:
        try:
            raw_jd_text = await asyncio.to_thread(fetch_jd_text, jd_url)
        except Exception as e:
            yield await _emit({"type": "error", "message": str(e)})
            return
    elif not raw_jd_text:
        yield await _emit({"type": "error", "message": "Provide jd_text or jd_url"})
        return

    yield await _emit({"type": "step", "step": 2, "message": "Extracting company, role, and requirements..."})

    try:
        job_details = await asyncio.to_thread(parse_jd, raw_jd_text, jd_url or "")
    except Exception as e:
        yield await _emit({"type": "error", "message": f"JD parsing failed: {e}"})
        return

    if not job_details.get("is_job_posting", True):
        yield await _emit({
            "type": "error",
            "message": "That link doesn't look like a job posting. Paste the job description text or a direct link to the job listing.",
        })
        return

    yield await _emit({"type": "step", "step": 3, "message": "Scraping company public pages..."})

    company_domain = job_details.get("company_domain", "")
    company_name = job_details.get("company_name", "")
    company_pages = await asyncio.to_thread(scrape_company_pages, company_domain)
    github_text = await asyncio.to_thread(scrape_github_org, company_name)
    if github_text:
        company_pages["github"] = github_text

    company_ddg = await asyncio.to_thread(search_company_signals, company_name)

    agent_state = {
        "job_details": job_details,
        "company_pages": company_pages,
        "company_ddg": company_ddg,
        "resume_text": resume_text,
        "user_context": user_context,
        "linkedin": linkedin,
        "github": github,
        "sign_off": sign_off,
    }

    yield await _emit({"type": "step", "step": 4, "message": "Finding contacts via Hunter.io..."})

    contacts: list[dict] = []
    if company_domain:
        try:
            contacts = await asyncio.to_thread(
                find_contacts, company_domain, job_details.get("role_title", ""), 5
            )
        except Exception as e:
            logger.warning("Contact finding failed: %s", e)
            yield await _emit({"type": "warning", "message": f"Contact search failed: {e}"})

    if not contacts and company_name:
        guessed_domain = company_name.lower().replace(" ", "").replace(",", "") + ".com"
        if guessed_domain != company_domain:
            logger.info(
                "No contacts for extracted domain %r, trying guessed domain %r",
                company_domain, guessed_domain,
            )
            yield await _emit({
                "type": "warning",
                "message": (
                    f"Could not find contacts for domain "
                    f"'{company_domain or '(none extracted)'}'. "
                    f"Trying guessed domain '{guessed_domain}'..."
                ),
            })
            try:
                contacts = await asyncio.to_thread(
                    find_contacts, guessed_domain, job_details.get("role_title", ""), 5
                )
            except Exception as e:
                logger.warning("Contact finding failed for guessed domain %s: %s", guessed_domain, e)

    if not contacts:
        yield await _emit({
            "type": "warning",
            "message": (
                "Could not determine a company domain or Hunter found no contacts. "
                "Please add contacts manually in the next step."
            ),
        })

    create_application(
        application_id=application_id,
        company=company_name,
        role=job_details.get("role_title", ""),
        job_url=job_details.get("job_url", jd_url or ""),
        jd_summary=job_details.get("team_focus", ""),
        raw_jd_text=raw_jd_text,
        agent_state=agent_state,
        status="awaiting_contacts",
    )

    if contacts:
        save_application_contacts(application_id, contacts)

    yield await _emit({
        "type": "contacts_ready",
        "application_id": application_id,
        "data": contacts,
        "job_details": job_details,
    })


async def confirm_and_generate(
    application_id: str,
    contacts: list[dict],
) -> AsyncGenerator[str, None]:
    app = get_application(application_id)
    if not app:
        yield await _emit({"type": "error", "message": "Application not found"})
        return

    state = app.get("agent_state") or {}
    job_details = state.get("job_details", {})
    company_name = job_details.get("company_name", "")
    resume_text = state.get("resume_text", "")
    user_context = state.get("user_context", "")
    linkedin = state.get("linkedin", "")
    github = state.get("github", "")
    sign_off = state.get("sign_off", "Best regards")
    company_pages = state.get("company_pages", {})
    company_ddg = state.get("company_ddg", [])
    jd_talking_points = job_details.get("talking_points_from_jd", [])

    saved_contacts = save_application_contacts(application_id, contacts)
    update_application_state(application_id, state, "generating")

    drafts: list[dict] = []
    failed: list[dict] = []
    used_subjects: list[str] = []

    for i, contact in enumerate(saved_contacts):
        contact_id = contact.get("id")
        name = contact.get("name", "")
        role = contact.get("role", "")
        email = contact.get("email", "")

        if not email:
            found = await asyncio.to_thread(
                _try_find_email, job_details.get("company_domain", ""), name
            )
            if found.get("email"):
                email = found["email"]
                contact["email"] = email
                contact["confidence"] = found.get("confidence", 0)
                contact["email_status"] = found.get("email_status", "ok")
                yield await _emit({
                    "type": "step",
                    "step": 5,
                    "message": f"Found an email for {name} via Hunter.io.",
                })

        if _is_unverified_contact(contact):
            yield await _emit({
                "type": "warning",
                "message": (
                    f"{name}'s email looks manually entered and unverified "
                    f"(personal address, no confidence score from Hunter) — "
                    f"double-check they actually work at {company_name} "
                    f"before sending."
                ),
            })

        yield await _emit({
            "type": "step",
            "step": 6,
            "message": f"Researching public signals for {name}...",
            "progress": f"{i + 1}/{len(saved_contacts)}",
        })

        person_snippets = await asyncio.to_thread(
            search_person_signals, name, company_name, contact.get("linkedin_url", "")
        )

        mismatch_note = next(
            (s for s in person_snippets if s.startswith("EMPLOYMENT_MISMATCH:")), None
        )
        if mismatch_note:
            full_detail = mismatch_note.split("EMPLOYMENT_MISMATCH:", 1)[1].strip()
            one_line_detail = full_detail.split("\n", 1)[0].strip()
            yield await _emit({
                "type": "warning",
                "message": f"{name} may not actually work at {company_name}: {one_line_detail}",
            })
            person_snippets = [
                (s.split("EMPLOYMENT_MISMATCH:", 1)[1].strip() if s is mismatch_note else s)
                for s in person_snippets
            ]

        yield await _emit({
            "type": "step",
            "step": 7,
            "message": f"Summarizing talking points for {name}...",
        })

        signals = await asyncio.to_thread(
            summarize_public_signals,
            name,
            company_name,
            role,
            jd_talking_points,
            _tag_company_signals(company_pages, company_ddg),
            person_snippets,
            user_context,
        )

        yield await _emit({
            "type": "step",
            "step": 8,
            "message": f"Writing email for {name}...",
        })

        try:
            if not email:
                yield await _emit({
                    "type": "warning",
                    "message": (
                        f"Could not find an email for {name} on Hunter.io — "
                        f"drafting the email anyway. Add their email manually "
                        f"before creating Gmail drafts."
                    ),
                })

            result = await asyncio.to_thread(
                generate_email,
                name,
                company_name,
                role,
                signals,
                resume_text,
                job_details.get("role_title", ""),
                job_details.get("job_url", ""),
                linkedin,
                github,
                sign_off,
                used_subjects,
            )
            used_subjects.append(result["subject"])
            update_contact_draft(contact_id, result["subject"], result["body"], "success")
            drafts.append({
                "contact_id": contact_id,
                "name": name,
                "email": email,
                "role": role,
                "confidence": contact.get("confidence", 0),
                "email_status": "missing" if not email else contact.get("email_status", "ok"),
                "subject": result["subject"],
                "body": result["body"],
                "status": "success",
            })
        except Exception as e:
            logger.exception("Email generation failed for %s", name)
            update_contact_draft(contact_id, "", "", "failed")
            failed.append({"contact_id": contact_id, "name": name, "error": str(e)})

    update_application_state(application_id, state, "complete")

    yield await _emit({
        "type": "drafts_ready",
        "application_id": application_id,
        "drafts": drafts,
        "failed": failed,
    })


async def generate_emails_for_contacts(
    application_id: str,
    contact_ids: list[int] | None = None,
) -> dict:
    """Generate emails for specific contacts (retry support)."""
    app = get_application(application_id)
    if not app:
        raise ValueError("Application not found")

    state = app.get("agent_state") or {}
    job_details = state.get("job_details", {})
    company_name = job_details.get("company_name", "")
    all_contacts = get_application_contacts(application_id)

    if contact_ids:
        targets = [c for c in all_contacts if c["id"] in contact_ids]
    else:
        targets = all_contacts

    drafts = []
    failed = []
    used_subjects = [
        c["draft_subject"] for c in all_contacts if c.get("draft_subject")
    ]

    for contact in targets:
        contact_id = contact["id"]
        name = contact.get("name", "")
        role = contact.get("role", "")
        email = contact.get("email", "")

        try:
            if not email:
                found = _try_find_email(job_details.get("company_domain", ""), name)
                if found.get("email"):
                    email = found["email"]

            person_snippets = search_person_signals(name, company_name, contact.get("linkedin_url", ""))
            signals = summarize_public_signals(
                name,
                company_name,
                role,
                job_details.get("talking_points_from_jd", []),
                _tag_company_signals(state.get("company_pages", {}), state.get("company_ddg", [])),
                person_snippets,
                state.get("user_context", ""),
            )

            result = generate_email(
                name,
                company_name,
                role,
                signals,
                state.get("resume_text", ""),
                job_details.get("role_title", ""),
                job_details.get("job_url", ""),
                state.get("linkedin", ""),
                state.get("github", ""),
                state.get("sign_off", "Best regards"),
                used_subjects,
            )
            used_subjects.append(result["subject"])
            update_contact_draft(contact_id, result["subject"], result["body"], "success")
            drafts.append({
                "contact_id": contact_id,
                "name": name,
                "email": email,
                "role": role,
                "email_status": "missing" if not email else contact.get("email_status", "ok"),
                "subject": result["subject"],
                "body": result["body"],
                "status": "success",
            })
        except Exception as e:
            update_contact_draft(contact_id, "", "", "failed")
            failed.append({"contact_id": contact_id, "name": name, "error": str(e)})

    return {"drafts": drafts, "failed": failed}
