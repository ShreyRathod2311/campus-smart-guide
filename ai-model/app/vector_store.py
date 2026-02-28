"""
In-memory vector store with cosine similarity search.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Callable, Optional


@dataclass
class Document:
    id: str
    content: str
    metadata: dict
    embedding: list[float] = field(default_factory=list)


@dataclass
class SearchResult:
    document: Document
    similarity: float


class VectorStore:
    """Simple in-memory vector store backed by a dict."""

    def __init__(self) -> None:
        self._docs: dict[str, Document] = {}

    # ------------------------------------------------------------------
    # Math helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        if len(a) != len(b):
            raise ValueError("Vectors must have the same length")
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    # ------------------------------------------------------------------
    # CRUD
    # ------------------------------------------------------------------
    def add(self, doc: Document) -> None:
        if not doc.embedding:
            raise ValueError("Document must have an embedding")
        self._docs[doc.id] = doc

    def add_many(self, docs: list[Document]) -> None:
        for d in docs:
            self.add(d)

    def get(self, doc_id: str) -> Optional[Document]:
        return self._docs.get(doc_id)

    def delete(self, doc_id: str) -> bool:
        return self._docs.pop(doc_id, None) is not None

    def clear(self) -> None:
        self._docs.clear()

    @property
    def size(self) -> int:
        return len(self._docs)

    def all_documents(self) -> list[Document]:
        return list(self._docs.values())

    # ------------------------------------------------------------------
    # Search
    # ------------------------------------------------------------------
    def search(
        self,
        query_embedding: list[float],
        *,
        limit: int = 5,
        threshold: float = 0.0,
        filter_fn: Optional[Callable[[Document], bool]] = None,
    ) -> list[SearchResult]:
        results: list[SearchResult] = []
        for doc in self._docs.values():
            if not doc.embedding:
                continue
            if filter_fn and not filter_fn(doc):
                continue
            sim = self._cosine_similarity(query_embedding, doc.embedding)
            if sim >= threshold:
                results.append(SearchResult(document=doc, similarity=sim))

        results.sort(key=lambda r: r.similarity, reverse=True)
        return results[:limit]


# Singleton
vector_store = VectorStore()
