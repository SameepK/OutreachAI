# OutreachAI – Job Application Email Agent 🤖

OutreachAI is an AI-powered job-application outreach agent that takes a job description and resume, extracts relevant information, researches the company and public web signals, finds relevant contacts, generates personalized outreach emails, and creates Gmail drafts for review.

## 🚀 Live Demo

[Try OutreachAI →](https://outreach-ai-wheat.vercel.app/)
[View Source Code →](https://github.com/SameepK/OutreachAI)

**Deployment**
- Frontend: Vercel
- Backend: Render
- Frontend URL: `https://outreach-ai-wheat.vercel.app`

## 🎯 What It Does

OutreachAI automates the repetitive parts of job-search outreach while keeping the user in control of the final communication.

Instead of manually:
1. Reading a job description
2. Researching the company
3. Finding relevant employees or recruiters
4. Researching those contacts
5. Writing personalized emails
6. Creating drafts

OutreachAI orchestrates the workflow automatically.

```text
Job Description + Resume
          │
          ▼
   Job Description
      Analysis
          │
          ▼
   Company Research
          │
          ▼
   Contact Discovery
          │
          ▼
    Human Review
          │
          ▼
  Public Web Research
          │
          ▼
Contact Signal Summary
          │
          ▼
Personalized Email
     Generation
          │
          ▼
    Gmail Draft
```

## ✨ Key Features

### 🧠 AI Job Description Analysis

Provide a job posting URL or pasted job description. The agent extracts information such as:
- Company
- Role
- Technology stack
- Responsibilities
- Required skills
- Relevant talking points

Groq is used for the language understanding and extraction steps.

### 🔎 Company Research

OutreachAI researches publicly available company information, including relevant public pages such as:
- `/about`
- `/blog`
- Other publicly accessible company pages

This information is used as additional context during outreach personalization.

### 👤 Contact Discovery

The application uses Hunter.io to discover potential contacts at the target company. Contacts are ranked using deterministic logic based on role/title relevance.

### ➕ Find More Contacts

If the initial contact results are not sufficient, users can search for additional contacts by department. The backend exposes:

```text
POST /agent/find-more-contacts
```

This allows the workflow to expand contact discovery without restarting the entire job-analysis process.

### 🛡️ Human-in-the-Loop Contact Review

OutreachAI does not blindly use every discovered contact. The workflow includes a mandatory human review step:

```text
AI discovers contacts
        │
        ▼
   User reviews
        │
   ┌────┴────┐
   │         │
Reject    Confirm
             │
             ▼
       Continue workflow
```

Users can review and edit contacts before the agent continues with personalization.

### 🌐 Public Web Research

For confirmed contacts, OutreachAI researches publicly available web information to identify useful personalization signals. The research layer can use Perplexity when configured, with DuckDuckGo as a fallback when `PERPLEXITY_API_KEY` is not set.

### ✍️ Personalized Outreach Emails

The email-generation workflow combines:

```text
Resume
   +
Job Description
   +
Company Research
   +
Contact Information
   +
Public Web Signals
        │
        ▼
Personalized Outreach Email
```

The goal is to produce outreach that is specific to the job, company, and contact instead of relying on generic templates.

### 📬 Gmail Integration

Generated emails can be created as Gmail drafts. The user can review and edit the emails before sending them. OutreachAI does not automatically send the emails.

### ⚡ Real-Time Agent Progress

The backend uses Server-Sent Events (SSE) to stream agent progress to the frontend. This allows the UI to show the workflow as it progresses instead of waiting for the entire process to complete.

## 🏗️ Architecture

```text
                         ┌──────────────────────┐
                         │    React Frontend    │
                         │       Vercel         │
                         │                      │
                         │  Job Input           │
                         │  Agent Progress      │
                         │  Contact Review      │
                         │  Draft Preview       │
                         └──────────┬───────────┘
                                    │
                               HTTP / SSE
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    FastAPI Backend   │
                         │        Render        │
                         │                      │
                         │  Agent Orchestrator  │
                         └──────────┬───────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
    Job Analysis             Company Research         Contact Discovery
       Groq                     Scrapling                 Hunter.io
          │                         │                         │
          └─────────────────────────┼─────────────────────────┘
                                    │
                                    ▼
                            Human Contact Review
                                    │
                                    ▼
                            Public Web Research
                                    │
                           ┌────────┴────────┐
                           │                 │
                      Perplexity        DuckDuckGo
                      (optional)         (fallback)
                           │                 │
                           └────────┬────────┘
                                    ▼
                            Signal Summarization
                                    │
                                    ▼
                          Personalized Email
                              Generation
                                    │
                                    ▼
                            Gmail Draft Creation
```

## 🔄 How It Works

OutreachAI follows an eight-stage workflow:

**1. Job Description Fetching**
Scrapling fetches the job description from a provided URL. Users can also provide the job description as text.

**2. Job Description Analysis**
Groq extracts company, role, technology stack, responsibilities, requirements, and relevant talking points.

**3. Company Research**
Public company pages are researched to provide additional context for personalization.

**4. Contact Discovery**
Hunter.io searches for potential contacts at the company. Contacts are ranked based on title and role relevance.

**5. Human Contact Review**
The user reviews the discovered contacts. This is a deliberate human approval gate before additional research and personalization.

**6. Public Web Research**
The system searches publicly available information about confirmed contacts. Perplexity can be used as the research provider when configured. If `PERPLEXITY_API_KEY` is not available, the system falls back to DuckDuckGo.

**7. Contact Signal Summarization**
The collected public information is summarized into structured signals that can be used during personalization.

**8. Email Generation & Gmail Drafts**
Groq generates personalized outreach emails. The user can then review the generated emails and create Gmail drafts.

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Frontend | React |
| Frontend Hosting | Vercel |
| Backend | Python / FastAPI |
| Backend Hosting | Render |
| LLM | Groq |
| Web Scraping | Scrapling |
| Browser Automation | Playwright |
| Contact Discovery | Hunter.io |
| Research | Perplexity / DuckDuckGo |
| Email | Gmail API |
| Authentication | Google OAuth |
| Backend Communication | REST + Server-Sent Events |
| Languages | Python / JavaScript |

## 📁 Project Structure

```text
OutreachAI/
├── src/
│   ├── back/
│   │   ├── app.py              # FastAPI entry point
│   │   ├── agent.py            # Agent orchestrator
│   │   ├── jd_scraper.py       # Job description fetching
│   │   ├── jd_parser.py        # Job description extraction
│   │   ├── company_scraper.py  # Company public pages
│   │   ├── web_search.py       # Web research + signal summary
│   │   ├── contact_finder.py   # Contact discovery + ranking
│   │   ├── hunter_client.py    # Hunter.io API
│   │   ├── gmail_auth.py       # Gmail OAuth
│   │   ├── gmail_drafts.py     # Gmail draft creation
│   │   ├── generator.py        # Email generation
│   │   ├── prompt.py           # Prompt engineering
│   │   └── requirements.txt
│   │
│   └── front/
│       └── src/
│           ├── App.jsx
│           └── components/
│               ├── JobInput.jsx
│               ├── AgentProgress.jsx
│               ├── ContactReview.jsx
│               ├── DraftPreview.jsx
│               └── DraftConfirmation.jsx
│
└── README.md
```

## ⚙️ Getting Started

### Prerequisites

You will need:
- Python 3.11+
- Node.js 18+
- Groq API key
- Hunter.io API key
- Google Cloud project and OAuth credentials for Gmail integration
- Perplexity API key (optional)

### 🐍 Backend Setup

```bash
cd src/back

python3 -m venv venv
source venv/bin/activate

pip install -r requirements.txt

playwright install chromium
```

The Playwright browser installation is required for JavaScript-heavy job boards and websites.

### 🔐 Environment Variables

Configure the following backend environment variables:

```bash
# Required
export GROQ_API_KEY="your_groq_key"
export HUNTER_API_KEY="your_hunter_key"

# Shared secret for protected API endpoints
export APP_API_KEY="your_shared_api_key"

# Optional research provider
# If unset, the application falls back to DuckDuckGo
export PERPLEXITY_API_KEY="your_perplexity_key"

# Gmail OAuth
export GOOGLE_CLIENT_ID="your_google_client_id"
export GOOGLE_CLIENT_SECRET="your_google_client_secret"
export GOOGLE_REDIRECT_URI="http://localhost:8000/auth/gmail/callback"

# Frontend / CORS
export FRONTEND_URL="http://localhost:5173"

# Deployed frontend origin
export DEPLOYED_FRONTEND_URL="https://outreach-ai-wheat.vercel.app"
```

**Environment Variable Reference**

| Variable | Required | Purpose |
|---|---|---|
| `GROQ_API_KEY` | Yes | LLM-powered extraction, summarization, and email generation |
| `HUNTER_API_KEY` | Yes | Contact discovery |
| `APP_API_KEY` | Yes | Shared secret for protected backend endpoints |
| `PERPLEXITY_API_KEY` | No | Primary web research provider; falls back to DuckDuckGo when unset |
| `GOOGLE_CLIENT_ID` | Gmail | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Gmail | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | Gmail | Google OAuth callback URL |
| `FRONTEND_URL` | Yes | Local frontend origin for CORS |
| `DEPLOYED_FRONTEND_URL` | Deployment | Deployed frontend origin added to the CORS allowlist |

**Security:** Never commit API keys, OAuth credentials, passwords, or `.env` files to Git.

### ▶️ Start the Backend

From `src/back`:

```bash
uvicorn app:app --reload
```

The backend will be available at:

```text
http://localhost:8000
```

### ⚛️ Frontend Setup

Open another terminal:

```bash
cd src/front

npm install
```

Create `src/front/.env` and add:

```env
VITE_API_BASE_URL=http://localhost:8000
```

Start the frontend:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## ☁️ Deployment

OutreachAI is deployed using separate frontend and backend services.

**Frontend — Vercel**

```text
https://outreach-ai-wheat.vercel.app
```

**Backend — Render**

The FastAPI backend is deployed on Render and serves the API consumed by the Vercel frontend. The deployed frontend origin is configured through:

```env
DEPLOYED_FRONTEND_URL=https://outreach-ai-wheat.vercel.app
```

This allows the deployed frontend origin to be included in the backend's CORS allowlist alongside the local development frontend.

## 📧 Gmail OAuth Setup

To enable Gmail draft creation:

1. Create a Google Cloud project.
2. Enable the Gmail API.
3. Configure the OAuth consent screen.
4. Add your Google account as a test user if required.
5. Create an OAuth client for a web application.
6. Configure the redirect URI:

```text
http://localhost:8000/auth/gmail/callback
```

7. Set:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/gmail/callback
```

8. Use **Connect Gmail** in the application.

The Gmail compose scope is:

```text
https://www.googleapis.com/auth/gmail.compose
```

## 🔑 API Authentication

Protected agent and Gmail actions require an API key. The client must send:

```http
X-API-Key: <APP_API_KEY>
```

The value must match the backend's configured `APP_API_KEY`.

## 📡 API Endpoints

**Authentication:** `POST /agent/run`, `POST /agent/confirm-contacts`, `POST /agent/generate-emails`, and `POST /gmail/create-drafts` require an `X-API-Key` header matching `APP_API_KEY`.

| Method | Path | Description |
|---|---|---|
| POST | `/agent/run` | SSE stream: steps 1–4, ending with `contacts_ready` |
| POST | `/agent/confirm-contacts` | SSE stream: steps 6–8, ending with `drafts_ready` |
| POST | `/agent/find-more-contacts` | Find additional contacts by department |
| POST | `/agent/generate-emails` | Retry failed contacts |
| POST | `/gmail/create-drafts` | Create Gmail drafts from edited emails |
| GET | `/auth/gmail/status` | Check Gmail connection status |
| GET | `/auth/gmail/login` | Start Google OAuth |
| GET/PUT | `/user/profile` | Resume/profile persistence |
| POST | `/parse-resume` | Upload resume and extract text |

## 📊 Hunter.io Confidence Thresholds

| Confidence | Behavior |
|---|---|
| `≥ 85` | Email used as-is |
| `50–84` | Warning shown during contact review |
| `< 50` | Email left blank for manual entry |

This gives users an opportunity to verify lower-confidence contact information before using it.

## 🧠 Engineering Highlights

**Multi-stage AI orchestration**
The system coordinates multiple AI and external services across a stateful workflow.

**Human-in-the-loop architecture**
The agent pauses for user review before continuing with contact personalization.

**Real-time streaming**
Server-Sent Events allow the frontend to receive progress from the backend as the workflow executes.

**External API integration**
The application integrates with Groq, Hunter.io, Gmail API, Google OAuth, Perplexity, DuckDuckGo, and public websites.

**Deterministic + AI decision making**
The system does not delegate every decision to an LLM. Contact discovery and ranking use deterministic logic, while LLMs handle natural-language extraction, summarization, personalization, and email generation.

## 🔒 Responsible Outreach

OutreachAI is designed as an AI-assisted outreach tool, not an indiscriminate bulk-email system. The workflow intentionally includes human review before outreach preparation continues. Users are responsible for:
- Reviewing generated emails
- Verifying contact information
- Respecting applicable privacy and email regulations
- Following the terms of third-party services
- Protecting API credentials

## 🚧 Limitations

OutreachAI depends on multiple external services, so behavior may be affected by:
- API rate limits
- Third-party API availability
- Website structure changes
- Scraping restrictions
- Availability of public contact information
- LLM-generated content requiring human review
- Gmail OAuth configuration

The application should therefore be treated as an AI-assisted workflow rather than a fully autonomous system.

## 🛣️ Future Improvements

- Persistent application and outreach history
- Outreach analytics
- Email response tracking
- Follow-up workflow
- Additional job-board integrations
- Improved contact relevance scoring
- Resume ↔ JD match analysis
- Background job processing
- Automated testing and CI/CD
- Production monitoring
- Improved authentication and authorization
- Additional personalization controls

## 📄 License

MIT License

## 👨‍💻 Author

**Sameep Kotecha**
Software Engineer focused on AI, full-stack systems, automation, and developer tools.
[GitHub](https://github.com/SameepK)

## ⭐ Try OutreachAI

If you're interested in AI-powered job-search automation, try the live application:

🚀 [Launch OutreachAI](https://outreach-ai-wheat.vercel.app/)
💻 [View the GitHub Repository](https://github.com/SameepK/OutreachAI)
