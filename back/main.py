from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from generator import generate_email
from mailer import send_email
from db import insert_email

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


@app.post("/generate-email")
def generate_email_route(req: GenerateRequest):
    """
    Generate a cold email subject + body via Ollama (Mistral).
    Returns: { subject: str, body: str }
    """
    try:
        result = generate_email(req.name, req.company, req.role, req.context)
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
