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
│   │   ├── app.py              # FastAPI entry point, CORS, API-key auth
│   │   ├── agent.py            # 8-step orchestrator (SSE)
│   │   ├── jd_scraper.py       # Scrapling JD fetch
│   │   ├── jd_parser.py        # Groq JD extraction
│   │   ├── company_scraper.py  # Company public pages
│   │   ├── web_search.py       # DuckDuckGo/Perplexity + signal summary
│   │   ├── contact_finder.py   # Hunter + title ranking
│   │   ├── hunter_client.py    # Hunter.io API
│   │   ├── gmail_auth.py       # Gmail OAuth
│   │   ├── gmail_drafts.py     # Gmail draft creation
│   │   ├── mailer.py           # SMTP fallback (optional)
│   │   ├── generator.py        # Email generation
│   │   ├── prompt.py           # Prompt engineering
│   │   ├── resume_parser.py    # Resume upload → text
│   │   ├── db.py               # User profile / application persistence
│   │   └── requirements.txt
│   └── front/
│       └── src/
│           ├── App.jsx
│           ├── api.js          # API base URL, API-key header, SSE parsing
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
export APP_API_KEY="your_own_shared_secret"  # required to call /agent/* and /gmail/create-drafts
export GMAIL_USER="your@gmail.com"           # optional SMTP fallback
export GMAIL_APP_PASSWORD="your_app_password"
export PERPLEXITY_API_KEY="..."              # optional, richer public-signal search

# Gmail OAuth (optional)
export GOOGLE_CLIENT_ID="..."
export GOOGLE_CLIENT_SECRET="..."
export GOOGLE_REDIRECT_URI="http://localhost:8000/auth/gmail/callback"

# CORS: origins allowed to call the API
export FRONTEND_URL="http://localhost:5173"       # local dev frontend
export DEPLOYED_FRONTEND_URL=""                    # e.g. https://your-app.vercel.app (production)
```

If `APP_API_KEY` isn't set, a random one is generated at startup and printed to the server log — fine for local dev, but set it explicitly anywhere the process can restart (like Render), or every restart invalidates the key your frontend is using.

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
VITE_API_KEY=your_own_shared_secret   # must match backend's APP_API_KEY
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

Endpoints marked 🔒 require an `X-API-Key` header matching `APP_API_KEY`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| POST | `/parse-resume` | Upload resume → text |
| GET/PUT | `/user/profile` | Resume persistence across sessions |
| POST 🔒 | `/agent/run` | SSE stream: steps 1–4, ends with `contacts_ready` |
| POST 🔒 | `/agent/confirm-contacts` | SSE stream: steps 6–8, ends with `drafts_ready` |
| POST 🔒 | `/agent/generate-emails` | Retry failed contacts (JSON) |
| POST 🔒 | `/agent/find-more-contacts` | Look up additional contacts by department |
| GET | `/agent/applications/{application_id}` | Fetch a saved application's state |
| GET | `/auth/gmail/status` | `{ connected: bool }` |
| GET | `/auth/gmail/login` | Redirect to Google OAuth |
| GET | `/auth/gmail/callback` | OAuth callback, redirects to `FRONTEND_URL` |
| POST 🔒 | `/gmail/create-drafts` | Create Gmail drafts from edited emails |

---

## Hunter.io confidence thresholds

| Confidence | Behavior |
|------------|----------|
| ≥ 85 | Email used as-is |
| 50–84 | Yellow warning in contact review |
| < 50 | Email left blank for manual entry |

---

## Deployment

Current setup: backend on **Render**, frontend on **Vercel**.

### Backend (Render)

- Root directory: `src/back`
- Build command: `pip install -r requirements.txt && playwright install chromium`
- Start command: `uvicorn app:app --host 0.0.0.0 --port $PORT`
- Set every backend env var from [Setup](#setup) above in Render's dashboard, plus:
  - `DEPLOYED_FRONTEND_URL` — your Vercel URL (e.g. `https://your-app.vercel.app`), required for CORS to allow the deployed frontend to call the API
  - `APP_API_KEY` — set explicitly; Render restarts the process on every deploy, and an auto-generated key changes each time

### Frontend (Vercel)

- Root directory: `src/front`
- Set `VITE_API_BASE_URL` to your Render backend URL and `VITE_API_KEY` matching `APP_API_KEY`
- Vite bakes env vars in at build time — after adding/changing them, trigger a redeploy, don't just save the setting

### Common failure: "Failed to fetch" in production

This almost always means one of:
1. `VITE_API_BASE_URL` isn't set on Vercel (defaults to `http://localhost:8000`, unreachable from a deployed site), or
2. `DEPLOYED_FRONTEND_URL` isn't set on Render, so CORS rejects the browser request from your Vercel origin.

Both must be set, and both services must be redeployed after setting them.

---

## License

MIT
