import os
import io
import pdfplumber
import smtplib
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from perplexity import Perplexity
from groq import Groq
from email.message import EmailMessage

app = FastAPI()

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

# ---------- API clients ----------
client = Perplexity(api_key=os.getenv("PERPLEXITY_API_KEY"))
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# ---------- Models ----------

class Recipient(BaseModel):
    name: str
    email: str
    company: str
    role: str
    job_url: str | None = None


class GenerateEmailRequest(BaseModel):
    name: str
    email: str
    company: str
    role: str
    context: str | None = ""
    target_role: str
    job_link: str | None = ""
    linkedin: str | None = ""
    github: str | None = ""
    sign_off: str = "Best regards"
    resume_text: str
    research_summary: str | None = ""

class SendEmailRequest(BaseModel):
    to_email: str
    subject: str
    body: str


# ---------- Helpers ----------

def split_subject_body(content: str) -> tuple[str, str]:
    """
    Expect model output in the form:
    Subject: ...
    Body:
    ...
    """
    lines = content.splitlines()
    subject = ""
    body_lines = []
    in_body = False

    for line in lines:
        if line.lower().startswith("subject:"):
            subject = line[len("Subject:"):].strip()
        elif line.lower().startswith("body:"):
            in_body = True
        elif in_body:
            body_lines.append(line)

    body = "\n".join(body_lines).strip()
    if not subject:
        # fallback if model didn't follow format
        subject = lines[0][:120]
        body = "\n".join(lines[1:]).strip()
    return subject, body


# ---------- Routes ----------

@app.post("/parse-resume")
async def parse_resume(file: UploadFile = File(...)):
    if file.content_type not in ["application/pdf", "text/plain", "text/markdown"]:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    content = await file.read()

    if file.content_type == "application/pdf" or file.filename.lower().endswith(".pdf"):
        try:
            resume_text = ""
            with pdfplumber.open(io.BytesIO(content)) as pdf:
                for page in pdf.pages:
                    resume_text += page.extract_text() or ""
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {e}")
    else:
        resume_text = content.decode("utf-8", errors="ignore")

    if not resume_text.strip():
        raise HTTPException(status_code=400, detail="Parsed resume is empty")

    return {"resume_text": resume_text}


@app.post("/research")
async def research_recipient(recipient: Recipient):
    prompt = f"""
Research {recipient.name} ({recipient.role} at {recipient.company}).
Key facts: recent achievements, company news, {recipient.job_url if recipient.job_url else 'role context'}.
Summarize in 200 words max for cold email personalization: talking points, mutual connections, trends.
Focus on verifiable facts only.
"""
    response = client.chat.completions.create(
        model="sonar",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=500,
        temperature=0.1,
    )
    research_summary = response.choices[0].message.content
    return {"research": research_summary}


@app.post("/generate-email")
async def generate_email(payload: GenerateEmailRequest):
    research_block = (
        f"\n\nReal-world research:\n{payload.research_summary}"
        if payload.research_summary
        else ""
    )

    user_prompt = f"""
Write a concise, personalized cold email to {payload.name} ({payload.role} at {payload.company})
about the role: {payload.target_role}.

Job posting: {payload.job_link or "N/A"}
Extra context from user: {payload.context or "N/A"}{research_block}

My resume:
{payload.resume_text}

My links:
- LinkedIn: {payload.linkedin or "N/A"}
- GitHub: {payload.github or "N/A"}

Format your output as:

Subject: <short subject line>

Body:
<email body here>

The email should be direct, 1–3 short paragraphs, no fluff, no fake familiarity, and end with the sign-off phrase: "{payload.sign_off}" followed by my full name.
"""

    resp = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are a precise cold-outreach email writer for a software engineer. "
                    "You only write professional emails suitable for reaching hiring managers, engineers, or recruiters."
                ),
            },
            {"role": "user", "content": user_prompt},
        ],
        max_tokens=800,
        temperature=0.3,
    )

    content = resp.choices[0].message.content
    subject, body = split_subject_body(content)

    return {"subject": subject, "body": body}

@app.post("/send-email")
async def send_email(payload: SendEmailRequest):
    # You should move these to env vars in real usage
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    smtp_user = os.getenv("SMTP_USER")  # your Gmail address
    smtp_pass = os.getenv("SMTP_PASS")  # app password, NOT raw account password

    if not smtp_user or not smtp_pass:
        raise HTTPException(status_code=500, detail="SMTP credentials not configured")

    msg = EmailMessage()
    msg["From"] = smtp_user
    msg["To"] = payload.to_email
    msg["Subject"] = payload.subject
    msg.set_content(payload.body)

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {e}")

    return {"status": "sent"}
