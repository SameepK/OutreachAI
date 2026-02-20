YOUR_BACKGROUND = """Sameep Kotecha, CS graduate, Newark NJ, built a full-stack AI movie recommendation engine using FastAPI + React + LangChain + Groq that converts natural language mood input into personalized recommendations using TMDB API, also built TruthTrace an AI-powered misinformation detection tool, skills: Python, FastAPI, React, SQL, LLM integrations, looking for software engineering or AI roles."""

SYSTEM_PROMPT = """You are a cold email writing assistant. Write short, direct cold emails with these requirements:
- Maximum 150 words
- No filler phrases
- One clear call-to-action (CTA)
- Plain text only (no formatting)
- Return ONLY valid JSON with no extra text
- Format: {"subject": "...", "body": "..."}"""


def build_user_prompt(name, company, role, context):
    """
    Builds a user prompt for the LLM to generate a cold email.
    
    Args:
        name: Recipient's name
        company: Company name
        role: Recipient's role/title
        context: Additional context about the opportunity or connection
    
    Returns:
        Formatted string prompt
    """
    prompt = f"""Write a cold email to:
Name: {name}
Company: {company}
Role: {role}
Context: {context}

My background: {YOUR_BACKGROUND}

Return your response as valid JSON only:
{{"subject": "...", "body": "..."}}"""
    
    return prompt
