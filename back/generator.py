import os
import json
from groq import Groq
from dotenv import load_dotenv
from prompt import SYSTEM_PROMPT, build_user_prompt

load_dotenv()

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
MODEL = "llama-3.3-70b-versatile"


def generate_email(name, company, role, context, resume_text=""):
    user_prompt = build_user_prompt(name, company, role, context, resume_text)

    chat_completion = client.chat.completions.create(
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        model=MODEL,
        response_format={"type": "json_object"}
    )

    message_content = chat_completion.choices[0].message.content.strip()
    email_data = json.loads(message_content)

    return {
        "subject": email_data.get("subject", ""),
        "body": email_data.get("body", "")
    }

if __name__ == "__main__":
    result = generate_email("John Smith", "OpenAI", "Software Engineer", "They are hiring for AI tooling", "")
    print("Subject:", result["subject"])
    print("\nBody:\n", result["body"])
