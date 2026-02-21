YOUR_BACKGROUND = """
CS graduate based in Newark, NJ. Two shipped projects:
1. Movie Mood Engine — full-stack app (FastAPI + React + LangChain + Groq) that converts natural language mood descriptions into personalized movie recommendations using TMDB API.
2. TruthTrace — AI-powered misinformation detection tool built with Python and LLMs.
Skills: Python, FastAPI, React, SQL, LangChain, Groq, LLM integrations.
Target: software engineering or AI engineering roles.
"""

SYSTEM_PROMPT = """
You are a JSON API. You only output valid JSON. Never output plain text.

Output format — you must return exactly this structure:
{"subject": "...", "body": "..."}

Email rules:
- Subject: 4-6 words only
- Body: max 75 words, plain text, no markdown
- Body starts with recipient first name and a comma
- Body ends with: Worth a chat?\n\nSameep
- Never use: wanted, would love, came across, hope, passionate, impressed, innovative, leverage, synergy
- Opening line must be specific to the company or role
- Middle: one project, one technical detail, why relevant
"""

def build_user_prompt(name: str, company: str, role: str, context: str) -> str:
    return f"""Write a cold email from Sameep Kotecha to {name}, {role} at {company}.
Context: {context}
Background: {YOUR_BACKGROUND}

Respond with ONLY this JSON and nothing else:
{{"subject": "your subject here", "body": "your body here"}}"""
