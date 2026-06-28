import asyncio
import json
import logging
import uuid
from typing import AsyncGenerator

from jd_scraper import fetch_jd_text
from jd_parser import parse_jd
from company_scraper import scrape_company_pages, scrape_github_org
from contact_finder import find_contacts
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


def check_playwright_installed() -> bool:
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            return p.chromium is not None
    except Exception:
        return False


def warn_playwright_if_missing() -> str | None:
    global _playwright_warning_logged
    if check_playwright_installed():
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

    pw_warning = warn_playwright_if_missing()
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
            contacts = await asyncio.to_thread(find_contacts, company_domain, 5)
        except Exception as e:
            logger.warning("Contact finding failed: %s", e)
            yield await _emit({"type": "warning", "message": f"Contact search failed: {e}"})

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

    for i, contact in enumerate(saved_contacts):
        contact_id = contact.get("id")
        name = contact.get("name", "")
        role = contact.get("role", "")
        email = contact.get("email", "")

        yield await _emit({
            "type": "step",
            "step": 6,
            "message": f"Researching public signals for {name}...",
            "progress": f"{i + 1}/{len(saved_contacts)}",
        })

        person_snippets = await asyncio.to_thread(search_person_signals, name, company_name)

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
            {**company_pages, "web": "\n".join(company_ddg[:5])},
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
                raise ValueError("No email address for contact")

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
            )
            update_contact_draft(contact_id, result["subject"], result["body"], "success")
            drafts.append({
                "contact_id": contact_id,
                "name": name,
                "email": email,
                "role": role,
                "confidence": contact.get("confidence", 0),
                "email_status": contact.get("email_status", "ok"),
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

    for contact in targets:
        contact_id = contact["id"]
        name = contact.get("name", "")
        role = contact.get("role", "")
        email = contact.get("email", "")

        try:
            person_snippets = search_person_signals(name, company_name)
            signals = summarize_public_signals(
                name,
                company_name,
                role,
                job_details.get("talking_points_from_jd", []),
                state.get("company_pages", {}),
                person_snippets,
                state.get("user_context", ""),
            )
            if not email:
                raise ValueError("No email address")

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
            )
            update_contact_draft(contact_id, result["subject"], result["body"], "success")
            drafts.append({
                "contact_id": contact_id,
                "name": name,
                "email": email,
                "role": role,
                "subject": result["subject"],
                "body": result["body"],
                "status": "success",
            })
        except Exception as e:
            update_contact_draft(contact_id, "", "", "failed")
            failed.append({"contact_id": contact_id, "name": name, "error": str(e)})

    return {"drafts": drafts, "failed": failed}
