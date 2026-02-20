import requests
import json
import re
from prompt import SYSTEM_PROMPT, build_user_prompt


def generate_email(name, company, role, context):
    """
    Generates a cold email using Ollama API.
    
    Args:
        name: Recipient's name
        company: Company name
        role: Recipient's role/title
        context: Additional context about the opportunity
    
    Returns:
        dict with "subject" and "body" keys
    """
    url = "http://localhost:11434/api/chat"
    
    user_prompt = build_user_prompt(name, company, role, context)
    
    payload = {
        "model": "mistral",
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        "stream": False
    }
    
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        
        result = response.json()
        
        # Extract the message content
        message_content = result.get("message", {}).get("content", "")
        
        # Handle case where response is wrapped in markdown code blocks
        # Remove markdown code block markers if present
        message_content = re.sub(r'^```json\s*', '', message_content, flags=re.MULTILINE)
        message_content = re.sub(r'^```\s*', '', message_content, flags=re.MULTILINE)
        message_content = re.sub(r'```\s*$', '', message_content, flags=re.MULTILINE)
        message_content = message_content.strip()
        
        # Parse JSON
        email_data = json.loads(message_content)
        
        return {
            "subject": email_data.get("subject", ""),
            "body": email_data.get("body", "")
        }
        
    except requests.exceptions.RequestException as e:
        raise Exception(f"Error calling Ollama API: {e}")
    except json.JSONDecodeError as e:
        raise Exception(f"Error parsing JSON response: {e}")


if __name__ == "__main__":
    # Test the generator
    name = "John Smith"
    company = "OpenAI"
    role = "Software Engineer"
    context = "They are hiring for AI tooling"
    
    print("Generating cold email...")
    print(f"To: {name} at {company} ({role})")
    print(f"Context: {context}\n")
    
    try:
        result = generate_email(name, company, role, context)
        
        print("=" * 50)
        print("SUBJECT:")
        print(result["subject"])
        print("\n" + "=" * 50)
        print("BODY:")
        print(result["body"])
        print("=" * 50)
        
    except Exception as e:
        print(f"Error: {e}")
