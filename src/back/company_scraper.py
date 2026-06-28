import logging
from urllib.parse import urljoin

from jd_scraper import _fetch_with_httpx, _fetch_with_scrapling_fast, _fetch_with_scrapling_stealth

logger = logging.getLogger(__name__)

ABOUT_PATHS = ["/about", "/about-us", "/company"]
BLOG_PATHS = ["/blog", "/engineering", "/tech-blog"]
TEAM_PATHS = ["/team", "/about/team", "/company/team"]


def _fetch_page_text(base_url: str, path: str) -> str:
    if not base_url.startswith("http"):
        base_url = f"https://{base_url}"
    url = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
    for fetcher in (_fetch_with_httpx, _fetch_with_scrapling_fast, _fetch_with_scrapling_stealth):
        try:
            text = fetcher(url)
            if len(text.strip()) > 100:
                return text[:2000]
        except Exception as e:
            logger.debug("company scrape %s failed: %s", url, e)
    return ""


def scrape_company_pages(company_domain: str) -> dict[str, str]:
    """Scrape public /about, /blog, /team pages. Skips /careers (JD already has role data)."""
    if not company_domain:
        return {"about": "", "blog": "", "team": ""}

    base = company_domain if company_domain.startswith("http") else f"https://{company_domain}"

    about_text = ""
    for path in ABOUT_PATHS:
        about_text = _fetch_page_text(base, path)
        if about_text:
            break

    blog_text = ""
    for path in BLOG_PATHS:
        blog_text = _fetch_page_text(base, path)
        if blog_text:
            break

    team_text = ""
    for path in TEAM_PATHS:
        team_text = _fetch_page_text(base, path)
        if team_text:
            break

    return {"about": about_text, "blog": blog_text, "team": team_text}


def scrape_github_org(company_name: str) -> str:
    slug = company_name.lower().replace(" ", "").replace(",", "")
    if not slug:
        return ""
    url = f"https://github.com/{slug}"
    try:
        return _fetch_with_httpx(url)[:1500]
    except Exception:
        return ""
