import json
import os
import re
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "openai/gpt-oss-120b"


def parse_jd(raw_jd_text: str, job_url: str = "") -> dict:
    prompt = f"""Determine whether the text below is a job posting/job description, then extract
structured details if it is.
Return ONLY valid JSON with these keys:
- is_job_posting (boolean — false if this is a README, blog post, homepage, article,
  or any other content that is not a job posting/job description)
- company_name (string, empty if not a job posting)
- company_domain (string, e.g. dropbox.com — infer from company if not explicit, empty if not a job posting)
- role_title (string, empty if not a job posting)
- location (string)
- tech_stack (array of strings)
- team_focus (string, one sentence)
- key_requirements (array of strings)
- talking_points_from_jd (array of 2-4 specific phrases useful for a cold email hook)
- job_url (string, use "{job_url}" if provided else empty string)

Text:
{raw_jd_text[:12000]}
"""

    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "You extract structured JSON from job descriptions. Output JSON only.",
            },
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        reasoning_effort="low",
    )

    data = json.loads(response.choices[0].message.content)
    domain = data.get("company_domain", "")
    if domain:
        domain = re.sub(r"^https?://", "", domain).strip("/").lower()
        domain = domain.replace("www.", "")
    data["company_domain"] = domain
    if job_url:
        data["job_url"] = job_url
    return data
