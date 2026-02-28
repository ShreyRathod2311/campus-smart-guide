"""
Document processor – chunking, cleaning, preparation for embedding.
"""

from __future__ import annotations

import re
from .config import rag_settings


class DocumentProcessor:
    def __init__(
        self,
        chunk_size: int = rag_settings.chunk_size,
        chunk_overlap: int = rag_settings.chunk_overlap,
    ):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    # ------------------------------------------------------------------
    # Chunking
    # ------------------------------------------------------------------
    def chunk_by_sentences(self, text: str) -> list[str]:
        sentences = re.findall(r"[^.!?\n]+[.!?\n]+", text)
        if not sentences:
            sentences = [text]

        chunks: list[str] = []
        current = ""
        for sent in sentences:
            if len(current) + len(sent) > self.chunk_size and current:
                chunks.append(current.strip())
                current = sent
            else:
                current += sent
        if current.strip():
            chunks.append(current.strip())
        return chunks

    # ------------------------------------------------------------------
    # Document creation
    # ------------------------------------------------------------------
    def process(
        self, content: str, metadata: dict
    ) -> list[dict]:
        """Return a list of chunk dicts (without embeddings)."""
        cleaned = re.sub(r"\s+", " ", content).strip()
        chunks = self.chunk_by_sentences(cleaned)

        docs: list[dict] = []
        title = metadata.get("title", "untitled")
        for idx, chunk in enumerate(chunks):
            docs.append(
                {
                    "id": f"{title}-chunk-{idx}",
                    "content": chunk,
                    "metadata": {
                        **metadata,
                        "chunk_index": idx,
                        "total_chunks": len(chunks),
                    },
                }
            )
        return docs


# Singleton
doc_processor = DocumentProcessor()
