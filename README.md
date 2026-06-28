# OutreachAI – Job Application Email Agent

Autonomous job-application agent: provide a job description + resume, and the agent extracts company details, finds contacts (Hunter.io), researches public web signals, writes personalized cold emails (Groq + `prompt.py`), and creates Gmail drafts for your review.

---

## How it works (8 steps)

1. Scrapling fetches the JD URL (or use pasted text)
2. Groq extracts company, role, tech stack, talking points
3. Scrapling scrapes company `/about` + `/blog` (public pages)
4. Hunter.io domain search + deterministic contact ranking
5. **You review/edit contacts** (mandatory gate)
6. DuckDuckGo public signals per contact
7. Groq summarizes → `public_signals_about_contact`
8. Groq writes emails → Gmail drafts (or in-app preview)

**No LinkedIn API.** JD-first personalization + public web only.

---

## Project structure

```
OutreachAI/
├── src/
│   ├── back/
│   │   ├── app.py              # FastAPI entry point
│   │   ├── agent.py            # 8-step orchestrator (SSE)
│   │   ├── jd_scraper.py       # Scrapling JD fetch
│   │   ├── jd_parser.py        # Groq JD extraction
│   │   ├── company_scraper.py  # Company public pages
│   │   ├── web_search.py       # DuckDuckGo + signal summary
│   │   ├── contact_finder.py   # Hunter + title ranking
│   │   ├── hunter_client.py    # Hunter.io API
│   │   ├── gmail_auth.py       # Gmail OAuth
│   │   ├── gmail_drafts.py     # Gmail draft creation
│   │   ├── generator.py        # Email generation
│   │   ├── prompt.py           # Prompt engineering
│   │   └── requirements.txt
│   └── front/
│       └── src/
│           ├── App.jsx
│           └── components/
│               ├── JobInput.jsx
│               ├── AgentProgress.jsx
│               ├── ContactReview.jsx
│               ├── DraftPreview.jsx
│               └── DraftConfirmation.jsx
└── README.md
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- [Groq API key](https://console.groq.com/)
- [Hunter.io API key](https://hunter.io/) (contact email discovery)
- Gmail account + [Google Cloud OAuth](https://console.cloud.google.com/) (optional, for drafts)

---

## Setup

### Backend

```bash
cd src/back
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Required for JS-heavy job boards (~150MB download)
playwright install chromium
```

Environment variables:

```bash
export GROQ_API_KEY="your_groq_key"
export HUNTER_API_KEY="your_hunter_key"
export GMAIL_USER="your@gmail.com"           # optional SMTP fallback
export GMAIL_APP_PASSWORD="your_app_password"

# Gmail OAuth (optional)
export GOOGLE_CLIENT_ID="..."
export GOOGLE_CLIENT_SECRET="..."
export GOOGLE_REDIRECT_URI="http://localhost:8000/auth/gmail/callback"
export FRONTEND_URL="http://localhost:5173"
```

Start API:

```bash
uvicorn app:app --reload
```

### Frontend

```bash
cd src/front
npm install
```

Create `src/front/.env`:

```
VITE_API_BASE_URL=http://localhost:8000
```

```bash
npm run dev
```

Open `http://localhost:5173`.

---

## Gmail OAuth setup

1. Create a Google Cloud project
2. Enable **Gmail API**
3. Configure OAuth consent screen (add your email as test user)
4. Create OAuth client (Web application)
5. Redirect URI: `http://localhost:8000/auth/gmail/callback`
6. Scope: `https://www.googleapis.com/auth/gmail.compose`
7. Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

Click **Connect Gmail** in the app header to authorize.

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/agent/run` | SSE stream: steps 1–4, ends with `contacts_ready` |
| POST | `/agent/confirm-contacts` | SSE stream: steps 6–8, ends with `drafts_ready` |
| POST | `/agent/generate-emails` | Retry failed contacts (JSON) |
| POST | `/gmail/create-drafts` | Create Gmail drafts from edited emails |
| GET | `/auth/gmail/status` | `{ connected: bool }` |
| GET | `/auth/gmail/login` | Redirect to Google OAuth |
| GET/PUT | `/user/profile` | Resume persistence across sessions |
| POST | `/parse-resume` | Upload resume → text |

---

## Hunter.io confidence thresholds

| Confidence | Behavior |
|------------|----------|
| ≥ 85 | Email used as-is |
| 50–84 | Yellow warning in contact review |
| < 50 | Email left blank for manual entry |

---

## License

MIT
