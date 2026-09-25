import os
import secrets
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from pydantic import BaseModel

from db import (
    get_user_profile,
    upsert_user_profile,
    get_application,
)
from resume_parser import extract_text_from_file
from agent import run_agent_phase_one, confirm_and_generate, generate_emails_for_contacts
from contact_finder import find_contacts_by_department
from gmail_auth import is_gmail_connected, get_auth_url, handle_oauth_callback
from gmail_drafts import create_drafts

load_dotenv()

app = FastAPI(title="OutreachAI Job Application Agent")

APP_API_KEY = os.getenv("APP_API_KEY")
if not APP_API_KEY:
    APP_API_KEY = secrets.token_urlsafe(24)
    print(
        f"[app] No APP_API_KEY set. Generated a temporary key for this run:\n"
        f"[app]   {APP_API_KEY}\n"
        f"[app] Set APP_API_KEY in .env to keep it stable across restarts."
    )


def require_api_key(x_api_key: str = Header(default="")) -> None:
    if not secrets.compare_digest(x_api_key, APP_API_KEY):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type", "X-API-Key"],
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


class AgentRunRequest(BaseModel):
    jd_text: str | None = None
    jd_url: str | None = None
    resume_text: str
    context: str = ""
    linkedin: str = ""
    github: str = ""
    sign_off: str = "Best regards"


class ContactModel(BaseModel):
    name: str
    role: str = ""
    email: str = ""
    linkedin_url: str = ""
    confidence: int = 0
    email_status: str = "ok"
    reason: str = ""


class ConfirmContactsRequest(BaseModel):
    application_id: str
    contacts: list[ContactModel]


class GenerateEmailsRequest(BaseModel):
    application_id: str
    contact_ids: list[int] | None = None


class FindMoreContactsRequest(BaseModel):
    application_id: str
    department: str


class DraftItem(BaseModel):
    contact_id: int | None = None
    to_email: str = ""
    email: str = ""
    subject: str
    body: str


class CreateDraftsRequest(BaseModel):
    drafts: list[DraftItem]


class UserProfileRequest(BaseModel):
    resume_text: str = ""
    resume_filename: str = ""
    linkedin: str = ""
    github: str = ""
    sign_off: str = "Best regards"


@app.get("/")
def health_check():
    return {"status": "running"}


@app.get("/debug/env-check")
def debug_env_check():
    return {
        "DEPLOYED_FRONTEND_URL": repr(os.getenv("DEPLOYED_FRONTEND_URL")),
        "FRONTEND_URL": repr(os.getenv("FRONTEND_URL")),
    }


@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    try:
        content = await file.read()
        resume_text = extract_text_from_file(content, file.filename or "resume.pdf")
        if not resume_text.strip():
            raise HTTPException(status_code=400, detail="Parsed resume is empty")
        return {"resume_text": resume_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/user/profile")
def get_profile():
    profile = get_user_profile()
    return profile or {}


@app.put("/user/profile")
def update_profile(payload: UserProfileRequest):
    return upsert_user_profile(
        resume_text=payload.resume_text,
        resume_filename=payload.resume_filename,
        linkedin=payload.linkedin,
        github=payload.github,
        sign_off=payload.sign_off,
    )


@app.post("/agent/run", dependencies=[Depends(require_api_key)])
async def agent_run(payload: AgentRunRequest):
    if not payload.resume_text.strip():
        raise HTTPException(status_code=400, detail="resume_text is required")

    return StreamingResponse(
        run_agent_phase_one(
            jd_text=payload.jd_text,
            jd_url=payload.jd_url,
            resume_text=payload.resume_text,
            user_context=payload.context,
            linkedin=payload.linkedin,
            github=payload.github,
            sign_off=payload.sign_off,
        ),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/agent/confirm-contacts", dependencies=[Depends(require_api_key)])
async def agent_confirm_contacts(payload: ConfirmContactsRequest):
    contacts = [c.model_dump() for c in payload.contacts]
    return StreamingResponse(
        confirm_and_generate(payload.application_id, contacts),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/agent/generate-emails", dependencies=[Depends(require_api_key)])
async def agent_generate_emails(payload: GenerateEmailsRequest):
    try:
        return await generate_emails_for_contacts(
            payload.application_id,
            payload.contact_ids,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/find-more-contacts", dependencies=[Depends(require_api_key)])
def find_more_contacts_route(payload: FindMoreContactsRequest):
    app_data = get_application(payload.application_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Application not found")

    job_details = (app_data.get("agent_state") or {}).get("job_details", {})
    company_domain = job_details.get("company_domain", "")
    if not company_domain:
        raise HTTPException(status_code=400, detail="No company domain on this application")

    try:
        contacts = find_contacts_by_department(company_domain, payload.department, limit=5)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e))

    if not contacts:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Can't find contacts on Hunter.io for '{payload.department}' at this company. "
                "You can add a contact manually, or look them up on Apollo.io, "
                "LinkedIn Sales Navigator, or a similar site."
            ),
        )
    return {"contacts": contacts}


@app.get("/agent/applications/{application_id}")
def get_application_route(application_id: str):
    app_data = get_application(application_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Application not found")
    return app_data


@app.get("/auth/gmail/status")
def gmail_status():
    return {"connected": is_gmail_connected()}


@app.get("/auth/gmail/login")
def gmail_login():
    try:
        return RedirectResponse(get_auth_url())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/auth/gmail/callback")
def gmail_callback(request: Request):
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing OAuth code")
    try:
        handle_oauth_callback(code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return RedirectResponse(f"{FRONTEND_URL}?gmail=connected")


@app.post("/gmail/create-drafts", dependencies=[Depends(require_api_key)])
def gmail_create_drafts(payload: CreateDraftsRequest):
    draft_dicts = []
    for d in payload.drafts:
        draft_dicts.append({
            "contact_id": d.contact_id,
            "to_email": d.to_email or d.email,
            "subject": d.subject,
            "body": d.body,
        })
    try:
        return create_drafts(draft_dicts)
    except RuntimeError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
