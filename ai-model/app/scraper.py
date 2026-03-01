"""
scraper.py — Async BITS Pilani web scraper for CSIS SmartAssist RAG.

Fetches real content from official BITS Pilani Goa web pages and
converts them into RAG-compatible document dicts.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime
from typing import Optional
from urllib.parse import urljoin, urlparse

import httpx
from bs4 import BeautifulSoup, Tag

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Pages to scrape — all official BITS Pilani Goa / CSIS sources
# ─────────────────────────────────────────────────────────────────────────────

BITS_URLS: list[dict] = [
    # Main campus pages
    {"url": "https://www.bits-pilani.ac.in/goa/", "category": "Campus Overview"},
    {"url": "https://www.bits-pilani.ac.in/goa/about-the-campus/", "category": "Campus Overview"},
    # CSIS department
    {"url": "https://www.bits-pilani.ac.in/goa/computer-science-and-information-systems/", "category": "CSIS Department"},
    {"url": "https://www.bits-pilani.ac.in/goa/computer-science-and-information-systems/about-the-department/", "category": "CSIS Department"},
    # Academic programmes
    {"url": "https://www.bits-pilani.ac.in/goa/academics/", "category": "Academics"},
    {"url": "https://www.bits-pilani.ac.in/goa/programmes-of-study-at-goa-campus/", "category": "Academics"},
    {"url": "https://www.bits-pilani.ac.in/admission/", "category": "Admissions"},
    # Research
    {"url": "https://www.bits-pilani.ac.in/goa/research/", "category": "Research"},
    {"url": "https://www.bits-pilani.ac.in/research/", "category": "Research"},
    # Faculty
    {"url": "https://www.bits-pilani.ac.in/goa/computer-science-and-information-systems/faculty/", "category": "Faculty"},
    # Student life & placements
    {"url": "https://www.bits-pilani.ac.in/goa/student-life/", "category": "Student Life"},
    {"url": "https://www.bits-pilani.ac.in/goa/placements/", "category": "Placements"},
    # Contact / administration
    {"url": "https://www.bits-pilani.ac.in/goa/contact-us/", "category": "Contact"},
]

# HTML tags whose content should be discarded
_SKIP_TAGS = {
    "script", "style", "noscript", "header", "footer",
    "nav", "aside", "iframe", "form", "meta", "head",
}

# Minimum characters for a scraped page to be worth indexing
_MIN_CONTENT_LENGTH = 200


class BITSWebScraper:
    """Async scraper that returns RAG-compatible document dicts from BITS Pilani web pages."""

    def __init__(
        self,
        timeout: float = 20.0,
        concurrency: int = 4,
        user_agent: str = "CSIS-SmartAssist-RAG/1.0 (educational bot; contact csis.office@goa.bits-pilani.ac.in)",
    ):
        self.timeout = timeout
        self.concurrency = concurrency
        self.headers = {"User-Agent": user_agent}

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    async def scrape(self) -> list[dict]:
        """
        Scrape all BITS_URLS concurrently.
        Returns a list of {content, metadata} dicts ready for RAGService.initialize().
        """
        semaphore = asyncio.Semaphore(self.concurrency)
        async with httpx.AsyncClient(
            headers=self.headers,
            timeout=self.timeout,
            follow_redirects=True,
        ) as client:
            tasks = [
                self._fetch_page(client, semaphore, entry["url"], entry["category"])
                for entry in BITS_URLS
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        docs: list[dict] = []
        for entry, result in zip(BITS_URLS, results):
            if isinstance(result, Exception):
                logger.warning("[scraper] Failed %s: %s", entry["url"], result)
                continue
            if result is not None:
                docs.append(result)

        logger.info("[scraper] Successfully scraped %d / %d pages", len(docs), len(BITS_URLS))
        return docs

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _fetch_page(
        self,
        client: httpx.AsyncClient,
        semaphore: asyncio.Semaphore,
        url: str,
        category: str,
    ) -> Optional[dict]:
        async with semaphore:
            try:
                resp = await client.get(url)
                resp.raise_for_status()
            except httpx.HTTPStatusError as e:
                logger.warning("[scraper] HTTP %d for %s", e.response.status_code, url)
                return None
            except Exception as e:
                logger.warning("[scraper] Error fetching %s: %s", url, e)
                return None

            text = self._extract_text(resp.text, url)
            if not text or len(text) < _MIN_CONTENT_LENGTH:
                logger.debug("[scraper] Skipping %s (too short / empty)", url)
                return None

            title = self._extract_title(resp.text) or self._url_to_title(url)
            logger.info("[scraper] ✓ %s (%d chars)", url, len(text))

            return {
                "content": text,
                "metadata": {
                    "title": title,
                    "category": category,
                    "source": url,
                    "scraped_at": datetime.utcnow().isoformat(),
                },
            }

    @staticmethod
    def _extract_title(html: str) -> Optional[str]:
        soup = BeautifulSoup(html, "lxml")
        tag = soup.find("title")
        if tag and tag.get_text(strip=True):
            return tag.get_text(strip=True).split("|")[0].strip()
        h1 = soup.find("h1")
        if h1:
            return h1.get_text(strip=True)
        return None

    @staticmethod
    def _url_to_title(url: str) -> str:
        path = urlparse(url).path.rstrip("/")
        last = path.split("/")[-1] if path else "BITS Pilani Goa"
        return last.replace("-", " ").title() or "BITS Pilani Goa"

    @staticmethod
    def _extract_text(html: str, url: str) -> str:
        soup = BeautifulSoup(html, "lxml")

        # Remove noisy tags
        for tag in soup.find_all(_SKIP_TAGS):
            tag.decompose()

        # Try to grab the main content area first
        main = (
            soup.find("main")
            or soup.find("article")
            or soup.find(id=re.compile(r"content|main|primary", re.I))
            or soup.find(class_=re.compile(r"content|main|primary|entry", re.I))
            or soup.body
        )

        if main is None:
            return ""

        lines: list[str] = []
        for element in main.descendants:
            if not isinstance(element, Tag):
                continue
            if element.name in {"h1", "h2", "h3", "h4"}:
                text = element.get_text(separator=" ", strip=True)
                if text:
                    prefix = "#" * int(element.name[1])
                    lines.append(f"\n{prefix} {text}\n")
            elif element.name in {"p", "li", "td", "th", "dd", "dt"}:
                text = element.get_text(separator=" ", strip=True)
                if text and len(text) > 10:
                    lines.append(text)

        content = "\n".join(lines)
        # Collapse excessive whitespace
        content = re.sub(r"\n{3,}", "\n\n", content).strip()
        return content
