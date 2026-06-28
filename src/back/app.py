import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, RedirectResponse
from pydantic import BaseModel

from generator import generate_email
from mailer import send_email
from db import (
    insert_email,
    get_user_profile,
    upsert_user_profile,
    get_application,
)
from resume_parser import extract_text_from_file
from agent import run_agent_phase_one, confirm_and_generate, generate_emails_for_contacts
from gmail_auth import is_gmail_connected, get_auth_url, handle_oauth_callback
from gmail_drafts import create_drafts

load_dotenv()

app = FastAPI(title="OutreachAI Job Application Agent")

origins = [
    "http://localhost:5173",
    "http://localhost:5180",
    "http://localhost:5181",
    "http://localhost:5182",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5180",
    "http://127.0.0.1:5181",
    "http://127.0.0.1:5182",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


class GenerateEmailRequest(BaseModel):
    name: str
    email: str
    company: str
    role: str
    public_signals_about_contact: str = ""
    resume_text: str
    target_role: str
    job_link: str = ""
    linkedin: str = ""
    github: str = ""
    sign_off: str = "Best regards"


class SendEmailRequest(BaseModel):
    to_name: str
    to_email: str
    company: str
    role: str
    subject: str
    body: str


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
    confidence: int = 0
    email_status: str = "ok"
    reason: str = ""


class ConfirmContactsRequest(BaseModel):
    application_id: str
    contacts: list[ContactModel]


class GenerateEmailsRequest(BaseModel):
    application_id: str
    contact_ids: list[int] | None = None


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


@app.post("/agent/run")
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


@app.post("/agent/confirm-contacts")
async def agent_confirm_contacts(payload: ConfirmContactsRequest):
    contacts = [c.model_dump() for c in payload.contacts]
    return StreamingResponse(
        confirm_and_generate(payload.application_id, contacts),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/agent/generate-emails")
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


@app.get("/agent/applications/{application_id}")
def get_application_route(application_id: str):
    app_data = get_application(application_id)
    if not app_data:
        raise HTTPException(status_code=404, detail="Application not found")
    return app_data


@app.post("/generate-email")
def generate_email_route(payload: GenerateEmailRequest):
    if not payload.resume_text.strip():
        raise HTTPException(status_code=400, detail="resume_text is required")

    try:
        result = generate_email(
            name=payload.name,
            company=payload.company,
            role=payload.role,
            public_signals_about_contact=payload.public_signals_about_contact,
            resume_text=payload.resume_text,
            target_role=payload.target_role,
            job_link=payload.job_link,
            linkedin=payload.linkedin,
            github=payload.github,
            sign_off=payload.sign_off,
        )
        return {"subject": result["subject"], "body": result["body"]}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/send-email")
def send_email_route(payload: SendEmailRequest):
    success = send_email(payload.to_email, payload.subject, payload.body)
    status = "sent" if success else "failed"

    insert_email(
        to_name=payload.to_name,
        to_email=payload.to_email,
        company=payload.company,
        role=payload.role,
        subject=payload.subject,
        body=payload.body,
        status=status,
    )

    if not success:
        raise HTTPException(
            status_code=500,
            detail="Failed to send email. Check GMAIL_USER and GMAIL_APP_PASSWORD.",
        )

    return {"status": "sent"}


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


@app.post("/gmail/create-drafts")
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
