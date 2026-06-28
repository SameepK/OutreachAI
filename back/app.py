import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from generator import generate_email
from mailer import send_email
from db import insert_email
from resume_parser import extract_text_from_file

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
