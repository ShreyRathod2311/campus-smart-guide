"""
Gemini REST API client – handles chat completions and embedding generation.
Uses direct HTTP calls to Google's Generative Language API.
"""

from __future__ import annotations

import json
import logging
import os
from typing import AsyncIterator

import httpx

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_BASE_URL = "https://generativelanguage.googleapis.com"

# Models to try for generation, in priority order
GENERATION_MODELS = [
    {"version": "v1", "model": "gemini-2.5-flash"},
    {"version": "v1", "model": "gemini-2.0-flash"},
    {"version": "v1", "model": "gemini-1.5-flash"},
]

EMBEDDING_MODEL = "text-embedding-004"


class GeminiClient:
    """Async wrapper around the Gemini REST API."""

    def __init__(self, api_key: str | None = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")

    # ------------------------------------------------------------------
    # Health / availability check
    # ------------------------------------------------------------------
    async def health_check(self) -> bool:
        """Return True if we can reach Gemini with a valid API key."""
        if not self.api_key:
            logger.warning("GEMINI_API_KEY not set")
            return False
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{GEMINI_BASE_URL}/v1/models?key={self.api_key}"
                )
                return resp.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> list[str]:
        """List available Gemini models."""
        if not self.api_key:
            return []
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{GEMINI_BASE_URL}/v1/models?key={self.api_key}"
                )
                resp.raise_for_status()
                data = resp.json()
                return [m["name"] for m in data.get("models", [])]
        except Exception:
            return []

    # ------------------------------------------------------------------
    # Embeddings
    # ------------------------------------------------------------------
    async def generate_embedding(self, text: str) -> list[float]:
        """Generate embedding using Gemini's text-embedding-004 model."""
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY not set")

        url = f"{GEMINI_BASE_URL}/v1beta/models/{EMBEDDING_MODEL}:embedContent?key={self.api_key}"

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                url,
                json={
                    "model": f"models/{EMBEDDING_MODEL}",
                    "content": {"parts": [{"text": text}]},
                },
            )
            resp.raise_for_status()
            return resp.json()["embedding"]["values"]

    async def generate_embeddings(self, texts: list[str]) -> list[list[float]]:
        results: list[list[float]] = []
        for text in texts:
            emb = await self.generate_embedding(text)
            results.append(emb)
        return results

    # ------------------------------------------------------------------
    # Chat helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _convert_messages(messages: list[dict]) -> tuple[str | None, list[dict]]:
        """
        Convert OpenAI-style messages (system/user/assistant) to Gemini format.
        Returns (system_instruction_text, contents).
        """
        system_text: str | None = None
        contents: list[dict] = []

        for m in messages:
            role = m["role"]
            text = m["content"]
            if role == "system":
                system_text = text
            elif role == "user":
                contents.append({"role": "user", "parts": [{"text": text}]})
            elif role == "assistant":
                contents.append({"role": "model", "parts": [{"text": text}]})

        return system_text, contents

    # ------------------------------------------------------------------
    # Chat (streaming) with model fallback
    # ------------------------------------------------------------------
    async def chat_stream(
        self,
        messages: list[dict],
        *,
        temperature: float = 0.7,
        max_tokens: int = 8192,
    ) -> AsyncIterator[str]:
        """
        Stream chat tokens from Gemini. Tries multiple models in fallback order.
        Yields text chunks.
        """
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY not set")

        system_text, contents = self._convert_messages(messages)

        body: dict = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "topK": 40,
                "topP": 0.8,
                "maxOutputTokens": max_tokens,
            },
        }
        if system_text:
            body["systemInstruction"] = {"parts": [{"text": system_text}]}

        last_error: Exception | None = None

        for model_info in GENERATION_MODELS:
            version = model_info["version"]
            model = model_info["model"]
            url = (
                f"{GEMINI_BASE_URL}/{version}/models/{model}"
                f":streamGenerateContent?alt=sse&key={self.api_key}"
            )

            try:
                logger.info("Trying Gemini %s/%s for streaming chat", version, model)
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(120, connect=30)
                ) as client:
                    async with client.stream("POST", url, json=body) as resp:
                        if resp.status_code != 200:
                            error_body = await resp.aread()
                            logger.warning(
                                "Gemini %s/%s returned %d: %s",
                                version, model, resp.status_code, error_body[:500],
                            )
                            last_error = RuntimeError(
                                f"Gemini {model} returned {resp.status_code}"
                            )
                            continue

                        logger.info("Connected to Gemini %s/%s (streaming)", version, model)
                        resp.encoding = "utf-8"
                        async for line in resp.aiter_lines():
                            if not line or not line.startswith("data: "):
                                continue
                            payload = line[6:].strip()
                            if not payload:
                                continue
                            try:
                                data = json.loads(payload)
                                text = (
                                    data.get("candidates", [{}])[0]
                                    .get("content", {})
                                    .get("parts", [{}])[0]
                                    .get("text", "")
                                )
                                if text:
                                    yield text
                            except (json.JSONDecodeError, IndexError, KeyError):
                                continue
                        # If we get here, streaming succeeded
                        return

            except Exception as exc:
                logger.warning("Gemini %s/%s streaming failed: %s", version, model, exc)
                last_error = exc
                continue

        raise last_error or RuntimeError("All Gemini models failed")

    # ------------------------------------------------------------------
    # Chat (non-streaming) with model fallback
    # ------------------------------------------------------------------
    async def chat(
        self,
        messages: list[dict],
        *,
        temperature: float = 0.7,
        max_tokens: int = 8192,
    ) -> str:
        """Non-streaming chat – returns the full response text."""
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY not set")

        system_text, contents = self._convert_messages(messages)

        body: dict = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature,
                "topK": 40,
                "topP": 0.8,
                "maxOutputTokens": max_tokens,
            },
        }
        if system_text:
            body["systemInstruction"] = {"parts": [{"text": system_text}]}

        last_error: Exception | None = None

        for model_info in GENERATION_MODELS:
            version = model_info["version"]
            model = model_info["model"]
            url = (
                f"{GEMINI_BASE_URL}/{version}/models/{model}"
                f":generateContent?key={self.api_key}"
            )

            try:
                logger.info("Trying Gemini %s/%s for chat", version, model)
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(120, connect=30)
                ) as client:
                    resp = await client.post(url, json=body)
                    resp.raise_for_status()
                    data = resp.json()
                    text = (
                        data.get("candidates", [{}])[0]
                        .get("content", {})
                        .get("parts", [{}])[0]
                        .get("text", "")
                    )
                    if text:
                        logger.info("Successfully generated with Gemini %s/%s", version, model)
                        return text
            except Exception as exc:
                logger.warning("Gemini %s/%s chat failed: %s", version, model, exc)
                last_error = exc
                continue

        raise last_error or RuntimeError("All Gemini models failed")


# Singleton
gemini_client = GeminiClient()
