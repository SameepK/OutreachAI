import smtplib
import os
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

def send_email(to_email: str, subject: str, body: str) -> bool:
    try:
        gmail_user = os.getenv("GMAIL_USER")
        gmail_password = os.getenv("GMAIL_APP_PASSWORD")
        
        if not gmail_user or not gmail_password:
            print("[mailer] Error: GMAIL_USER and GMAIL_APP_PASSWORD must be set in .env")
            return False
        
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = gmail_user
        msg["To"] = to_email

        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as smtp:
            smtp.login(gmail_user, gmail_password)
            smtp.sendmail(gmail_user, to_email, msg.as_string())
        
        print(f"[mailer] Email sent to {to_email}")
        return True

    except smtplib.SMTPAuthenticationError as e:
        print(f"[mailer] Authentication failed: Check your GMAIL_APP_PASSWORD in .env")
        print(f"[mailer] Error details: {e}")
        return False
    except Exception as e:
        print(f"[mailer] Failed: {e}")
        return False

if __name__ == "__main__":
    success = send_email(
        "kotechasameep123@gmail.com",
        "Test Cold Email",
        "Hey,\n\nThis is a test from the cold-email agent via Gmail SMTP.\n\nCheers"
    )
    print("[mailer] Test passed ✓" if success else "[mailer] Test failed ✗")
