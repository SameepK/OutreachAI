import os
from dotenv import load_dotenv
from fastapi import Cookie, Depends, FastAPI, HTTPException, UploadFile, File, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from pydantic import BaseModel

from sessions import get_or_create_session, get_application, check_and_increment_usage, RateLimitExceeded
from resume_parser import extract_text_from_file
from agent import run_agent_phase_one, confirm_and_generate, generate_emails_for_contacts
from contact_finder import find_contacts_by_department
from gmail_auth import is_gmail_connected, get_auth_url, handle_oauth_callback
from gmail_drafts import create_drafts

load_dotenv()

app = FastAPI(title="OutreachAI Job Application Agent")

DEPLOYED_FRONTEND_URL = os.getenv("DEPLOYED_FRONTEND_URL", "")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1):\d+$",
    allow_origins=[DEPLOYED_FRONTEND_URL] if DEPLOYED_FRONTEND_URL else [],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["Content-Type"],
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

SESSION_COOKIE = "session_id"
SESSION_MAX_AGE = 6 * 3600


def get_session_id_and_data(session_id: str | None = Cookie(default=None, alias=SESSION_COOKIE)) -> tuple[str, dict]:
    return get_or_create_session(session_id)


def set_session_cookie(response: Response, session_id: str) -> None:
    """Every route that touches session data calls this on whatever Response
    it actually returns. Setting it via a Response *dependency* doesn't work
    here: FastAPI discards those header mutations whenever the route handler
    returns its own Response object (RedirectResponse/StreamingResponse),
    which several routes below do — so each route sets it explicitly instead."""
    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_id,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=SESSION_MAX_AGE,
    )


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


@app.get("/")
def health_check():
    return {"status": "running"}


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


@app.post("/agent/run")
async def agent_run(payload: AgentRunRequest, session_data: tuple = Depends(get_session_id_and_data)):
    session_id, session = session_data
    if not payload.resume_text.strip():
        raise HTTPException(status_code=400, detail="resume_text is required")
    try:
        check_and_increment_usage(session)
    except RateLimitExceeded as e:
        raise HTTPException(status_code=429, detail=str(e))

    response = StreamingResponse(
        run_agent_phase_one(
            session,
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
    set_session_cookie(response, session_id)
    return response


@app.post("/agent/confirm-contacts")
async def agent_confirm_contacts(payload: ConfirmContactsRequest, session_data: tuple = Depends(get_session_id_and_data)):
    session_id, session = session_data
    contacts = [c.model_dump() for c in payload.contacts]
    response = StreamingResponse(
        confirm_and_generate(session, payload.application_id, contacts),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
    set_session_cookie(response, session_id)
    return response


@app.post("/agent/generate-emails")
async def agent_generate_emails(payload: GenerateEmailsRequest, response: Response, session_data: tuple = Depends(get_session_id_and_data)):
    session_id, session = session_data
    set_session_cookie(response, session_id)
    try:
        return await generate_emails_for_contacts(
            session,
            payload.application_id,
            payload.contact_ids,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/agent/find-more-contacts")
def find_more_contacts_route(payload: FindMoreContactsRequest, response: Response, session_data: tuple = Depends(get_session_id_and_data)):
    session_id, session = session_data
    set_session_cookie(response, session_id)
    app_data = get_application(session, payload.application_id)
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
def get_application_route(application_id: str, response: Response, session_data: tuple = Depends(get_session_id_and_data)):
    session_id, session = session_data
    set_session_cookie(response, session_id)
    app_data = get_application(session, application_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Application not found")
    return app_data


@app.get("/auth/gmail/status")
def gmail_status(response: Response, session_data: tuple = Depends(get_session_id_and_data)):
    session_id, session = session_data
    set_session_cookie(response, session_id)
    return {"connected": is_gmail_connected(session)}


@app.get("/auth/gmail/login")
def gmail_login(session_data: tuple = Depends(get_session_id_and_data)):
    session_id, _session = session_data
    try:
        response = RedirectResponse(get_auth_url())
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    set_session_cookie(response, session_id)
    return response


@app.get("/auth/gmail/callback")
def gmail_callback(request: Request, session_data: tuple = Depends(get_session_id_and_data)):
    session_id, session = session_data
    code = request.query_params.get("code")
    if not code:
        raise HTTPException(status_code=400, detail="Missing OAuth code")
    try:
        handle_oauth_callback(session, code)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    response = RedirectResponse(f"{FRONTEND_URL}?gmail=connected")
    set_session_cookie(response, session_id)
    return response


@app.post("/gmail/create-drafts")
def gmail_create_drafts(payload: CreateDraftsRequest, response: Response, session_data: tuple = Depends(get_session_id_and_data)):
    session_id, session = session_data
    set_session_cookie(response, session_id)
    try:
        check_and_increment_usage(session)
    except RateLimitExceeded as e:
        raise HTTPException(status_code=429, detail=str(e))

    draft_dicts = []
    for d in payload.drafts:
        draft_dicts.append({
            "contact_id": d.contact_id,
            "to_email": d.to_email or d.email,
            "subject": d.subject,
            "body": d.body,
        })
    try:
        return create_drafts(session, draft_dicts)
    except RuntimeError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
