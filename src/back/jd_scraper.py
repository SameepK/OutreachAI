import logging
import httpx
import trafilatura

logger = logging.getLogger(__name__)

IGNORE_TAGS = ("script", "style", "nav", "footer", "header")


def _extract_text_from_html(html: str) -> str:
    extracted = trafilatura.extract(html, include_comments=False, include_tables=True)
    if extracted and len(extracted.strip()) > 100:
        return extracted.strip()
    return ""


def _fetch_with_httpx(url: str) -> str:
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
    }
    with httpx.Client(follow_redirects=True, timeout=30.0, headers=headers) as client:
        response = client.get(url)
        response.raise_for_status()
        return _extract_text_from_html(response.text) or response.text


def _fetch_with_scrapling_fast(url: str) -> str:
    from scrapling.fetchers import Fetcher

    page = Fetcher.get(url, stealthy_headers=True, impersonate="chrome")
    if hasattr(page, "get_all_text"):
        text = page.get_all_text(ignore_tags=IGNORE_TAGS)
    else:
        text = page.text or ""
    return text.strip()


def _fetch_with_scrapling_stealth(url: str) -> str:
    from scrapling.fetchers import StealthyFetcher

    page = StealthyFetcher.fetch(
        url,
        headless=True,
        solve_cloudflare=True,
        network_idle=True,
    )
    if hasattr(page, "get_all_text"):
        text = page.get_all_text(ignore_tags=IGNORE_TAGS)
    else:
        text = page.text or ""
    return text.strip()


def fetch_jd_text(url: str) -> str:
    """Fetch job description text: httpx → Scrapling Fetcher → StealthyFetcher."""
    errors: list[str] = []

    try:
        text = _fetch_with_httpx(url)
        if len(text.strip()) > 200:
            return text.strip()
    except Exception as e:
        errors.append(f"httpx: {e}")

    try:
        text = _fetch_with_scrapling_fast(url)
        if len(text.strip()) > 200:
            return text.strip()
    except Exception as e:
        errors.append(f"Fetcher: {e}")

    try:
        text = _fetch_with_scrapling_stealth(url)
        if len(text.strip()) > 200:
            return text.strip()
    except Exception as e:
        errors.append(f"StealthyFetcher: {e}")

    logger.warning("JD fetch failed for %s: %s", url, "; ".join(errors))
    raise RuntimeError(
        "Could not fetch job description. Try pasting the JD text directly."
    )
