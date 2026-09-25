import os
import json
import re
import time
from groq import Groq, APIStatusError
from dotenv import load_dotenv
from prompt import SIGNALS_CHAR_CAP, SYSTEM_PROMPT, build_user_prompt

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "openai/gpt-oss-120b"
_TPM_RETRY_WAIT_SECONDS = 20
_TPM_MAX_RETRIES = 2


def _normalize_for_match(s: str) -> str:
    """Normalize typographic punctuation/whitespace so provenance matching
    isn't defeated by curly quotes or extra whitespace the model may
    introduce or collapse when copying an excerpt."""
    s = s.replace("’", "'").replace("‘", "'")
    s = s.replace("“", '"').replace("”", '"')
    s = s.replace("–", "-").replace("—", "-")
    return re.sub(r"\s+", " ", s).strip()


def generate_email(
    name,
    company,
    role,
    public_signals_about_contact="",
    resume_text="",
    target_role="",
    job_link="",
    linkedin="",
    github="",
    sign_off="Best regards",
    previous_subjects=None,
):
    user_prompt = build_user_prompt(
        name,
        company,
        role,
        public_signals_about_contact,
        resume_text,
        target_role,
        job_link,
        linkedin,
        github,
        sign_off,
        previous_subjects,
    )

    for attempt in range(_TPM_MAX_RETRIES + 1):
        try:
            chat_completion = client.chat.completions.create(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                model=MODEL,
                response_format={"type": "json_object"},
                reasoning_effort="low",
            )
            break
        except APIStatusError as e:
            # ponytail: fixed backoff, not token-budget-aware; switch to
            # honoring the API's retry-after header if this proves flaky.
            is_tpm_limit = e.status_code == 413 and "tokens per minute" in str(e)
            if not is_tpm_limit or attempt == _TPM_MAX_RETRIES:
                raise
            time.sleep(_TPM_RETRY_WAIT_SECONDS)

    message_content = chat_completion.choices[0].message.content.strip()
    email_data = json.loads(message_content)

    subject = email_data.get("subject", "").strip()
    body = email_data.get("email_body", email_data.get("body", "")).strip()
    if not subject or not body:
        raise ValueError("Model returned empty subject or body")

    hook_source_excerpt = email_data.get("hook_source_excerpt")
    if hook_source_excerpt and isinstance(hook_source_excerpt, str):
        hook_source_excerpt = hook_source_excerpt.strip()
        if hook_source_excerpt:
            # Match against the same truncated signals text build_user_prompt
            # actually sent the model, not the full untruncated string —
            # otherwise a real excerpt sourced from beyond the cap would be
            # indistinguishable from a fabricated one.
            truncated_signals = (public_signals_about_contact or "").strip()[:SIGNALS_CHAR_CAP]
            provenance_sources = _normalize_for_match("\n".join([
                truncated_signals,
                job_link or "",
                target_role or "",
            ]))
            if _normalize_for_match(hook_source_excerpt) not in provenance_sources:
                raise ValueError(
                    "Model fabricated hook_source_excerpt — not found verbatim in "
                    f"public_signals_about_contact, job_link, or role_title: {hook_source_excerpt!r}"
                )

    return {
        "subject": subject,
        "body": body,
    }


if __name__ == "__main__":
    result = generate_email(
        "John Smith",
        "OpenAI",
        "Software Engineer",
        "They recently shipped a new inference API for developers.",
        "Sample resume text here...",
        "Backend Engineer",
        "https://openai.com/careers/backend-engineer",
        "https://linkedin.com/in/sample",
        "https://github.com/sample",
        "Best regards",
    )
    print("Subject:", result["subject"])
    print("\nBody:\n", result["body"])
