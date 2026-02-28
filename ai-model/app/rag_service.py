"""
RAG Service – retrieval-augmented generation.
"""

from __future__ import annotations

import time
import logging
from typing import Optional

from .config import rag_settings, rag_system_prompt, SYSTEM_PROMPT
from .ollama_client import ollama_client
from .vector_store import vector_store, Document, SearchResult
from .document_processor import doc_processor
from .models import SourceDocument

logger = logging.getLogger(__name__)


class RAGService:
    # ------------------------------------------------------------------
    # Initialisation – load docs into vector store
    # ------------------------------------------------------------------
    async def initialize(
        self, documents: list[dict]
    ) -> int:
        """Embed and store documents. Returns number of chunks created."""
        vector_store.clear()
        total = 0
        for doc_data in documents:
            chunks = doc_processor.process(doc_data["content"], doc_data["metadata"])
            for chunk in chunks:
                try:
                    emb = await ollama_client.generate_embedding(chunk["content"])
                    vector_store.add(
                        Document(
                            id=chunk["id"],
                            content=chunk["content"],
                            metadata=chunk["metadata"],
                            embedding=emb,
                        )
                    )
                    total += 1
                except Exception as exc:
                    logger.warning("Failed to embed chunk %s: %s", chunk["id"], exc)
        logger.info("RAG initialised with %d chunks", total)
        return total

    async def add_document(self, content: str, metadata: dict) -> None:
        chunks = doc_processor.process(content, metadata)
        for chunk in chunks:
            emb = await ollama_client.generate_embedding(chunk["content"])
            vector_store.add(
                Document(
                    id=chunk["id"],
                    content=chunk["content"],
                    metadata=chunk["metadata"],
                    embedding=emb,
                )
            )

    # ------------------------------------------------------------------
    # Retrieval
    # ------------------------------------------------------------------
    async def retrieve(
        self,
        query: str,
        *,
        limit: int = rag_settings.max_retrieval_docs,
        threshold: float = rag_settings.similarity_threshold,
        category: Optional[str] = None,
    ) -> list[SourceDocument]:
        emb = await ollama_client.generate_embedding(query)

        filter_fn = None
        if category:
            filter_fn = lambda doc: doc.metadata.get("category") == category  # noqa: E731

        results: list[SearchResult] = vector_store.search(
            emb, limit=limit, threshold=threshold, filter_fn=filter_fn
        )
        return [self._to_source(r) for r in results]

    # ------------------------------------------------------------------
    # Context building
    # ------------------------------------------------------------------
    async def build_context(
        self, query: str, *, category: Optional[str] = None
    ) -> tuple[str, list[SourceDocument], int]:
        """Returns (context_text, sources, retrieval_ms)."""
        start = time.time()
        sources = await self.retrieve(query, category=category)
        retrieval_ms = int((time.time() - start) * 1000)

        if not sources:
            return "", sources, retrieval_ms

        parts: list[str] = []
        for idx, s in enumerate(sources, 1):
            parts.append(
                f"[{idx}] {s.title} ({s.category})\n{s.content}"
                + (f"\nSource: {s.source}" if s.source else "")
            )
        context_text = "\n\n---\n\n".join(parts)
        return context_text, sources, retrieval_ms

    def build_system_prompt(self, context_text: str) -> str:
        if not context_text:
            return SYSTEM_PROMPT
        return rag_system_prompt(context_text)

    # ------------------------------------------------------------------
    # Stats
    # ------------------------------------------------------------------
    def stats(self) -> dict:
        docs = vector_store.all_documents()
        categories = list({d.metadata.get("category", "unknown") for d in docs})
        return {"total_chunks": vector_store.size, "categories": categories}

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _to_source(result: SearchResult) -> SourceDocument:
        d = result.document
        return SourceDocument(
            id=d.id,
            title=d.metadata.get("title", ""),
            content=d.content,
            category=d.metadata.get("category", ""),
            source=d.metadata.get("source"),
            similarity=round(result.similarity, 4),
        )


# Singleton
rag_service = RAGService()
