"""
Ollama HTTP client – handles chat completions and embedding generation.
"""

from __future__ import annotations

import json
from typing import AsyncIterator

import httpx

from .config import settings


class OllamaClient:
    """Thin async wrapper around the Ollama REST API."""

    def __init__(
        self,
        base_url: str = settings.base_url,
        model: str = settings.model,
        embedding_model: str = settings.embedding_model,
    ):
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.embedding_model = embedding_model

    # ------------------------------------------------------------------
    # Health / model listing
    # ------------------------------------------------------------------
    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                return resp.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> list[str]:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(f"{self.base_url}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                return [m["name"] for m in data.get("models", [])]
        except Exception:
            return []

    # ------------------------------------------------------------------
    # Embeddings
    # ------------------------------------------------------------------
    async def generate_embedding(self, text: str) -> list[float]:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{self.base_url}/api/embeddings",
                json={"model": self.embedding_model, "prompt": text},
            )
            resp.raise_for_status()
            return resp.json()["embedding"]

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        results: list[list[float]] = []
        for text in texts:
            emb = await self.generate_embedding(text)
            results.append(emb)
        return results

    # ------------------------------------------------------------------
    # Chat (streaming)
    # ------------------------------------------------------------------
    async def chat_stream(
        self,
        messages: list[dict],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> AsyncIterator[str]:
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": True,
            "options": {
                "temperature": temperature or settings.temperature,
                "top_p": settings.top_p,
                "top_k": settings.top_k,
                "num_predict": max_tokens or settings.max_tokens,
            },
        }
        async with httpx.AsyncClient(timeout=httpx.Timeout(300, connect=30)) as client:
            async with client.stream(
                "POST", f"{self.base_url}/api/chat", json=payload
            ) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line:
                        continue
                    try:
                        data = json.loads(line)
                        token = data.get("message", {}).get("content", "")
                        if token:
                            yield token
                    except json.JSONDecodeError:
                        continue

    # ------------------------------------------------------------------
    # Chat (non-streaming)
    # ------------------------------------------------------------------
    async def chat(
        self,
        messages: list[dict],
        *,
        temperature: float | None = None,
        max_tokens: int | None = None,
    ) -> str:
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature or settings.temperature,
                "top_p": settings.top_p,
                "top_k": settings.top_k,
                "num_predict": max_tokens or settings.max_tokens,
            },
        }
        async with httpx.AsyncClient(timeout=httpx.Timeout(300, connect=30)) as client:
            resp = await client.post(f"{self.base_url}/api/chat", json=payload)
            resp.raise_for_status()
            return resp.json()["message"]["content"]


# Singleton
ollama_client = OllamaClient()
