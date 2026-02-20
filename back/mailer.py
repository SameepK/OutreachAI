import os
import resend
from dotenv import load_dotenv

load_dotenv()

resend.api_key = os.getenv("RESEND_API_KEY")


def send_email(to_email: str, subject: str, body: str) -> bool:
    """
    Send a plain-text email via the Resend API.

    Args:
        to_email:  Recipient email address.
        subject:   Email subject line.
        body:      Plain-text email body.

    Returns:
        True if the email was sent successfully, False otherwise.
    """
    try:
        response = resend.Emails.send({
            "from": "onboarding@resend.dev",
            "to": to_email,
            "subject": subject,
            "text": body,
        })
        print(f"[mailer] Email sent successfully to {to_email} (id: {response['id']})")
        return True

    except Exception as e:
        print(f"[mailer] Failed to send email: {e}")
        return False


if __name__ == "__main__":
    # Fill in RESEND_API_KEY in back/.env before running.
    # The "to" address must be your verified Resend account email
    # when using the shared onboarding@resend.dev sender.
    test_to = "kotechasameep123@gmail.com"  # <-- replace with your email address
    test_subject = "Test Cold Email"
    test_body = (
        "Hey there,\n\n"
        "This is a test email sent from the cold-email AI agent.\n"
        "If you're reading this, your Resend setup is working correctly!\n\n"
        "Cheers"
    )

    success = send_email(test_to, test_subject, test_body)
    if success:
        print("[mailer] Test passed ✓")
    else:
        print("[mailer] Test failed ✗ — check your RESEND_API_KEY and try again.")
