# Cold Email Agent

An AI-powered full-stack cold email tool. Enter a prospect's name, company, and role — the agent generates a personalized cold email using an LLM and sends it directly via the Resend API. All outreach attempts are logged to a local SQLite database.

---

## Tech Stack

| Layer | Technology |
|------------|-------------------------------------|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Python, FastAPI |
| AI / LLM | Groq API (Llama 3.3-70B Versatile) |
| Email Send | Resend API |
| Database | SQLite |

---

## Features

- **AI-generated emails** — Personalized subject + body via Groq's Llama 3.3-70B with structured JSON output
- **Live preview** — Review the generated email before sending
- **One-click delivery** — Send directly via Resend API from the UI
- **Outreach logging** — SQLite DB tracks every attempt (recipient, company, role, subject, body, status)
- **Modular backend** — Cleanly separated `generator.py`, `mailer.py`, `db.py`, and `prompt.py` modules

---

## Project Structure

```
cold-email-agent/
├── back/               # Python FastAPI backend
│   ├── main.py         # API routes (/generate-email, /send-email)
│   ├── generator.py    # Groq LLM email generation
│   ├── mailer.py       # Resend API email delivery
│   ├── db.py           # SQLite logging
│   ├── prompt.py       # System + user prompt engineering
│   └── emails.db       # Auto-created SQLite database
└── front/              # React + Vite frontend
    └── src/
        └── components/
            ├── EmailForm.jsx         # Input form
            ├── EmailPreview.jsx      # Preview before send
            └── SentConfirmation.jsx  # Post-send confirmation
```

---

## Getting Started

### Prerequisites

- Python 3.9+
- Node.js 18+
- A [Groq API key](https://console.groq.com/)
- A [Resend API key](https://resend.com/)

---

### Backend Setup

```bash
cd back
pip install fastapi uvicorn groq resend python-dotenv pydantic
```

Create a `.env` file inside `/back`:

```env
GROQ_API_KEY=your_groq_api_key_here
RESEND_API_KEY=your_resend_api_key_here
```

Start the server:

```bash
uvicorn main:app --reload
```

API runs at `http://localhost:8000`

---

### Frontend Setup

```bash
cd front
npm install
npm run dev
```

App runs at `http://localhost:5173`

---

## API Endpoints

### `POST /generate-email`

Generates a personalized cold email using the Groq LLM.

**Request body:**
```json
{
  "name": "John Smith",
  "email": "john@company.com",
  "company": "Acme Corp",
  "role": "Software Engineer",
  "context": "They recently launched a new AI product"
}
```

**Response:**
```json
{
  "subject": "...",
  "body": "..."
}
```

---

### `POST /send-email`

Sends the email via Resend and logs the attempt to SQLite.

**Request body:**
```json
{
  "to_name": "John Smith",
  "to_email": "john@company.com",
  "company": "Acme Corp",
  "role": "Software Engineer",
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
|------------------|-------------------------------|
| `GROQ_API_KEY` | Groq API key for LLM access |
| `RESEND_API_KEY` | Resend API key for email send |

---

## License

MIT
