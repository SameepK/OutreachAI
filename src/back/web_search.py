import os
import time
import logging
import httpx
from groq import Groq
from dotenv import load_dotenv

from db import get_search_cache, set_search_cache

load_dotenv()

logger = logging.getLogger(__name__)
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "openai/gpt-oss-120b"

PERPLEXITY_BASE = "https://api.perplexity.ai"

_last_ddg_call = 0.0
DDG_MIN_INTERVAL = 1.5


def research_contact_via_perplexity(name: str, company: str, linkedin_url: str = "") -> list[str]:
    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        raise RuntimeError("PERPLEXITY_API_KEY is not set")

    prompt = (
        f"Give a concise, cited summary of {name}'s public professional "
        f"background and activity (talks, posts, projects, career history), "
        f"especially anything relevant to their work at {company}. "
        f"Cite sources inline. "
        f"First, explicitly verify whether {name} currently works at {company}. "
        f"If your research indicates they do NOT currently work there (different "
        f"employer, former employee, no evidence of ever working there, etc.), "
        f"start your response with exactly this line: "
        f"\"EMPLOYMENT_MISMATCH: <one sentence explaining what you found instead>\" "
        f"before anything else. If they do currently work at {company}, do not "
        f"include that line at all."
    )
    if linkedin_url:
        prompt += f"\nLinkedIn: {linkedin_url}"

    with httpx.Client(timeout=20.0) as http_client:
        response = http_client.post(
            f"{PERPLEXITY_BASE}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "sonar",
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        response.raise_for_status()
        data = response.json()

    content = (data["choices"][0]["message"]["content"] or "").strip()
    return [content] if content else []


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


def search_person_signals(name: str, company: str, linkedin_url: str = "") -> list[str]:
    if os.getenv("PERPLEXITY_API_KEY"):
        try:
            result = research_contact_via_perplexity(name, company, linkedin_url)
            if result:
                return result
        except Exception as e:
            logger.warning(
                "Perplexity research failed for %s at %s: %s; falling back to DuckDuckGo",
                name, company, e,
            )

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
If the input contains ONLY GENERIC_COMPANY_INFO tagged content with no
SPECIFIC_RECENT_SIGNAL present, output exactly "[none provided]" instead of
writing bullet points from the generic content. Do not paraphrase, summarize,
or extract talking points from GENERIC_COMPANY_INFO-only input, mission
statements and about-us language are not usable signal. Only write bullets
when SPECIFIC_RECENT_SIGNAL content exists, and only from that content.
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
        reasoning_effort="low",
    )
    return response.choices[0].message.content.strip()
