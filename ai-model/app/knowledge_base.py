"""
knowledge_base.py — Loads RAG content from BITS Pilani web pages.
All content is scraped live from official BITS Pilani Goa URLs.
No hardcoded / invented data is used.
"""

from __future__ import annotations
import logging
from .rag_service import rag_service
from .scraper import BITSWebScraper

logger = logging.getLogger(__name__)


async def load_knowledge_base() -> None:
    """Scrape BITS Pilani web pages and load them into the RAG vector store."""
    logger.info("[knowledge_base] Scraping BITS Pilani web pages …")
    scraper = BITSWebScraper()
    documents = await scraper.scrape()

    if not documents:
        logger.warning(
            "[knowledge_base] No documents scraped — RAG will refuse all queries. "
            "Check network connectivity to www.bits-pilani.ac.in"
        )
        # Load empty so the vector store is initialised (bot will refuse gracefully)
        await rag_service.initialize([])
        return

    total = await rag_service.initialize(documents)
    stats = rag_service.stats()
    logger.info(
        "[knowledge_base] Loaded %d chunks from %d scraped pages across %d categories",
        total,
        len(documents),
        len(stats["categories"]),
    )


async def add_document(
    content: str,
    title: str,
    category: str,
    source: str | None = None,
) -> None:
    """Dynamically add a document to the knowledge base at runtime."""
    from datetime import datetime

    await rag_service.add_document(
        content,
        {
            "title": title,
            "category": category,
            "source": source,
            "created_at": datetime.utcnow().isoformat(),
        },
    )
    logger.info("[knowledge_base] Added document: %s", title)
