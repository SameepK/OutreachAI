import os
import logging
from typing import Any

from dotenv import load_dotenv
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from google.auth.transport.requests import Request

load_dotenv()

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/gmail.compose"]


def _client_config() -> dict:
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv(
        "GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/gmail/callback"
    )
    if not client_id or not client_secret:
        raise RuntimeError("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set")
    return {
        "web": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri],
        }
    }


def is_gmail_connected(session: dict[str, Any]) -> bool:
    return session.get("gmail_creds") is not None


def get_auth_url() -> str:
    redirect_uri = os.getenv(
        "GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/gmail/callback"
    )
    flow = Flow.from_client_config(
        _client_config(),
        scopes=SCOPES,
        redirect_uri=redirect_uri,
        autogenerate_code_verifier=False,
    )
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
    )
    return auth_url


def handle_oauth_callback(session: dict[str, Any], code: str) -> None:
    redirect_uri = os.getenv(
        "GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/gmail/callback"
    )
    flow = Flow.from_client_config(
        _client_config(),
        scopes=SCOPES,
        redirect_uri=redirect_uri,
        autogenerate_code_verifier=False,
    )
    flow.fetch_token(code=code)
    session["gmail_creds"] = flow.credentials


def get_credentials(session: dict[str, Any]) -> Credentials | None:
    creds = session.get("gmail_creds")
    if not creds:
        return None
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        session["gmail_creds"] = creds
    return creds
