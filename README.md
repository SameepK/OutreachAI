# OutreachAI – Cold Email Agent

A full-stack AI-powered cold email agent. Upload your resume, enter a recipient's details, optionally trigger real-time research via Perplexity Sonar, and generate + send a personalized cold email — all from a clean React UI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS |
| Backend | Python, FastAPI |
| Email Generation | Groq API – Llama 3.3-70B Versatile |
| Recipient Research | Perplexity Sonar API (real-time web search) |
| Resume Parsing | PyPDF2 (PDF), plain text fallback |
| Email Delivery | Gmail SMTP via App Password |
| Database | SQLite (outreach logging) |

---

## Features

- **Resume upload** — Drag-and-drop or click to upload PDF, TXT, or MD (max 10MB); text is extracted and injected into the prompt
- **Recipient research toggle** — Optional checkbox that calls Perplexity Sonar to pull real-time facts about the recipient and company before generating
- **AI-generated emails** — Groq (Llama 3.3-70B) writes a personalized subject + body grounded in your resume, research context, job link, LinkedIn, and GitHub
- **Prompt engineering** — Dedicated `prompt.py` with a structured system prompt that enforces crisp, role-specific outreach
- **Live preview** — Review the generated email in `EmailPreview.jsx` before sending
- **One-click delivery** — Send directly via Gmail SMTP from the UI
- **Outreach logging** — Every send attempt (recipient, company, role, subject, body, status) is logged to a local SQLite DB via `db.py`
- **Configurable API base URL** — Frontend reads `VITE_API_BASE_URL` from `.env` for easy staging/prod overrides

---

## Project Structure

```
OutreachAI/
├── back/
│   ├── app.py              # Consolidated FastAPI app (Perplexity + Gmail SMTP routes)
│   ├── main.py             # Original modular FastAPI entry point
│   ├── generator.py        # Groq email generation logic
│   ├── mailer.py           # Gmail SMTP send function
│   ├── db.py               # SQLite logging (insert + query)
│   ├── prompt.py           # SYSTEM_PROMPT + build_user_prompt()
│   ├── resume_parser.py    # PyPDF2-based PDF + text extraction
│   └── emails.db           # Auto-created SQLite database
└── front/
    └── src/
        └── components/
            ├── EmailForm.jsx       # Input form, resume upload, research toggle
            ├── EmailPreview.jsx    # Preview generated email before sending
            └── SentConfirmation.jsx # Post-send success screen
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Groq API key](https://console.groq.com/)
- [Perplexity API key](https://www.perplexity.ai/settings/api)
- Gmail account with 2FA enabled + an [App Password](https://myaccount.google.com/apppasswords)

### Backend Setup

```bash
cd back
python3 -m venv venv
source venv/bin/activate
pip install fastapi uvicorn groq perplexityai pdfplumber PyPDF2 python-dotenv pydantic
```

Export environment variables in the same terminal you run uvicorn from:

```bash
export GROQ_API_KEY="your_groq_api_key"
export PERPLEXITY_API_KEY="your_perplexity_api_key"
export GMAIL_USER="your_gmail@gmail.com"
export GMAIL_APP_PASSWORD="your_16char_app_password"
```

Start the server:

```bash
uvicorn app:app --reload
```

API runs at `http://localhost:8000`. Swagger docs at `http://localhost:8000/docs`.

### Frontend Setup

```bash
cd front
npm install
```

Create `front/.env`:

```
VITE_API_BASE_URL=http://localhost:8000
```

Start the dev server:

```bash
npm run dev
```

App runs at `http://localhost:5173`.

---

## API Endpoints

### `GET /`
Health check. Returns `{ "status": "running" }`.

---

### `POST /parse-resume`
Upload a resume file and get back extracted plain text.

**Request:** `multipart/form-data` with a `file` field (PDF, TXT, or MD, max 10MB)

**Response:**
```json
{ "resume_text": "..." }
```

---

### `POST /research`
Uses Perplexity Sonar to research the recipient and company in real time.

**Request body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@company.com",
  "company": "Acme Corp",
  "role": "Head of Engineering",
  "job_url": "https://company.com/careers/job-id"
}
```

**Response:**
```json
{ "research": "..." }
```

---

### `POST /generate-email`
Generates a personalized cold email using Groq, grounded in resume + optional research.

**Request body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@company.com",
  "company": "Acme Corp",
  "role": "Head of Engineering",
  "target_role": "Software Engineer",
  "resume_text": "...",
  "research_summary": "...",
  "job_link": "https://...",
  "linkedin": "https://linkedin.com/in/...",
  "github": "https://github.com/...",
  "sign_off": "Best regards",
  "context": "..."
}
```

**Response:**
```json
{ "subject": "...", "body": "..." }
```

---

### `POST /send-email`
Sends the email via Gmail SMTP and returns send status.

**Request body:**
```json
{
  "to_email": "jane@company.com",
  "subject": "...",
  "body": "..."
}
```

**Response:**
```json
{ "status": "sent" }
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Groq API key for LLM email generation |
| `PERPLEXITY_API_KEY` | Perplexity Sonar API key for recipient research |
| `GMAIL_USER` | Gmail address to send from |
| `GMAIL_APP_PASSWORD` | Gmail App Password (16 chars, no spaces) |
| `VITE_API_BASE_URL` | Frontend base URL for API calls (e.g. `http://localhost:8000`) |

---

## License

MIT
