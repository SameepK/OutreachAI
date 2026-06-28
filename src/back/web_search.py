import os
import time
import logging
from groq import Groq
from dotenv import load_dotenv

from db import get_search_cache, set_search_cache

load_dotenv()

logger = logging.getLogger(__name__)
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"

_last_ddg_call = 0.0
DDG_MIN_INTERVAL = 1.5


def _ddg_search(query: str, max_results: int = 5) -> list[str]:
    global _last_ddg_call
    cached = get_search_cache(query)
    if cached is not None:
        return cached

    elapsed = time.time() - _last_ddg_call
    if elapsed < DDG_MIN_INTERVAL:
        time.sleep(DDG_MIN_INTERVAL - elapsed)

    from duckduckgo_search import DDGS

    snippets: list[str] = []
    try:
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=max_results):
                body = r.get("body") or r.get("snippet") or ""
                title = r.get("title") or ""
                if body or title:
                    snippets.append(f"{title}: {body}".strip())
        _last_ddg_call = time.time()
    except Exception as e:
        logger.warning("DuckDuckGo search failed for %r: %s", query, e)
        return []

    set_search_cache(query, snippets)
    return snippets


def search_company_signals(company: str) -> list[str]:
    results: list[str] = []
    for q in [
        f'"{company}" engineering blog',
        f'"{company}" product launch news',
    ]:
        results.extend(_ddg_search(q, max_results=3))
    return results[:8]


def search_person_signals(name: str, company: str) -> list[str]:
    results: list[str] = []
    for q in [
        f'site:linkedin.com/in "{name}" "{company}"',
        f'"{name}" "{company}" conference OR blog OR github',
    ]:
        results.extend(_ddg_search(q, max_results=3))
    return results[:6]


def summarize_public_signals(
    name: str,
    company: str,
    role: str,
    jd_talking_points: list[str],
    company_signals: dict[str, str],
    person_snippets: list[str],
    user_context: str = "",
) -> str:
    company_blob = "\n".join(
        f"{k}: {v[:500]}" for k, v in company_signals.items() if v
    )
    jd_blob = "\n".join(f"- {p}" for p in jd_talking_points)
    person_blob = "\n".join(f"- {s}" for s in person_snippets[:5])

    prompt = f"""Given the inputs below, write 2-3 specific talking points for a cold email to {name} ({role} at {company}).
Use ONLY verifiable facts from the inputs. Max 100 words total.
If nothing specific about the person, say "[none provided]" for person-specific points and rely on company/JD points.
User-provided context (highest priority): {user_context or "[none]"}

JD talking points:
{jd_blob or "[none]"}

Company page snippets:
{company_blob or "[none]"}

Web search about person:
{person_blob or "[none]"}

Output plain text bullet points only, no JSON."""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "You write concise cold-email talking points. Facts only.",
            },
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        max_tokens=200,
    )
    return response.choices[0].message.content.strip()
