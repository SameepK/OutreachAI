from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from generator import generate_email
from mailer import send_email
from db import insert_email
from resume_parser import extract_text_from_file

load_dotenv()

app = FastAPI(title="Cold Email Agent API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request models ────────────────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    name: str
    email: str
    company: str
    role: str
    context: str = ""
    resume_text: str = ""  # Required resume content
    target_role: str = ""  # Role the user is applying for
    job_link: str = ""  # Optional job posting URL
    linkedin: str = ""  # Optional LinkedIn URL
    github: str = ""   # Optional GitHub URL
    sign_off: str = "Best regards"


class SendRequest(BaseModel):
    to_name: str
    to_email: str
    company: str
    role: str
    subject: str
    body: str


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {"status": "running"}


@app.post("/parse-resume")
async def parse_resume_route(file: UploadFile = File(...)):
    """
    Upload and parse a resume file (PDF or text).
    Returns: { resume_text: str }
    """
    try:
        file_content = await file.read()
        resume_text = extract_text_from_file(file_content, file.filename)
        return {"resume_text": resume_text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/generate-email")
def generate_email_route(req: GenerateRequest):
    """
    Generate a cold email subject + body using Groq.
    Returns: { subject: str, body: str }
    """
    try:
        result = generate_email(
            req.name,
            req.company,
            req.role,
            req.context,
            req.resume_text,
            req.target_role,
            req.job_link,
            req.linkedin,
            req.github,
            req.sign_off,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/send-email")
def send_email_route(req: SendRequest):
    """
    Send the email via Resend and log the attempt to SQLite.
    Returns: { status: "sent" } on success, HTTP 500 on failure.
    """
    success = send_email(req.to_email, req.subject, req.body)
    status = "sent" if success else "failed"

    insert_email(
        to_name=req.to_name,
        to_email=req.to_email,
        company=req.company,
        role=req.role,
        subject=req.subject,
        body=req.body,
        status=status,
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email. Check RESEND_API_KEY.")

    return {"status": "sent"}
