"""
FastAPI main application – Campus Smart Guide AI backend.
"""

from __future__ import annotations

import json
import logging
import time
import urllib.parse
from contextlib import asynccontextmanager
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sse_starlette.sse import EventSourceResponse

from app.config import settings as ollama_settings, SYSTEM_PROMPT
from app.models import ChatRequest, HealthResponse, Message
from app.ollama_client import ollama_client
from app.rag_service import rag_service
from app.knowledge_base import load_knowledge_base

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)


# ------------------------------------------------------------------
# Lifespan – initialise on startup
# ------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up – scraping BITS Pilani web pages for knowledge base …")
    try:
        healthy = await ollama_client.health_check()
        if healthy:
            await load_knowledge_base()
            logger.info("Knowledge base ready.")
        else:
            logger.warning(
                "Ollama not reachable at %s – RAG disabled until reconnect.",
                ollama_settings.base_url,
            )
    except Exception as exc:
        logger.error("Startup error: %s", exc)
    yield
    logger.info("Shutting down …")


app = FastAPI(
    title="Campus Smart Guide AI",
    version="2.0.0",
    lifespan=lifespan,
)

# CORS – allow the Vite dev server and Docker frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
        "http://frontend:3000",
        "http://frontend",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------
# Routes
# ------------------------------------------------------------------


@app.get("/")
async def root():
    """Root route – confirms the server is running."""
    return {
        "message": "Campus Smart Guide AI backend is running",
        "version": "2.0.0",
        "docs": "/docs",
    }


@app.get("/api/health", response_model=HealthResponse)
async def health():
    """Health / readiness check."""
    ollama_ok = await ollama_client.health_check()
    models: list[str] = []
    if ollama_ok:
        try:
            models = await ollama_client.list_models()
        except Exception:
            pass

    stats = rag_service.stats()
    return HealthResponse(
        status="healthy" if ollama_ok else "degraded",
        ollama_connected=ollama_ok,
        models_available=models,
        rag_documents=stats["total_chunks"],
        rag_categories=stats["categories"],
    )


@app.post("/api/chat")
async def chat_stream(req: ChatRequest):
    """SSE streaming chat endpoint – mirrors the interface expected by the frontend."""
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages required")

    user_message = req.messages[-1].content
    history: list[dict] = [{"role": m.role, "content": m.content} for m in req.messages]

    # ---- RAG retrieval ----
    system_prompt = SYSTEM_PROMPT
    sources_payload: list[dict] = []
    retrieval_ms = 0

    if req.use_rag:
        try:
            context_text, sources, retrieval_ms = await rag_service.build_context(
                user_message, category=req.category
            )
            if context_text:
                system_prompt = rag_service.build_system_prompt(context_text)
                sources_payload = [s.model_dump() for s in sources]
        except Exception as exc:
            logger.warning("RAG retrieval failed: %s", exc)

    # ---- Build messages for Ollama ----
    ollama_messages: list[dict] = [{"role": "system", "content": system_prompt}]
    ollama_messages.extend(history)

    # ---- SSE generator ----
    async def event_generator():
        start = time.time()

        # 1) send metadata first
        metadata = {
            "type": "metadata",
            "sources": sources_payload,
            "generatedImage": None,
            "retrieval_ms": retrieval_ms,
        }
        yield {"data": json.dumps(metadata, ensure_ascii=False)}

        # 2) stream tokens
        try:
            async for token in ollama_client.chat_stream(ollama_messages):
                payload = {
                    "choices": [{"delta": {"content": token}}]
                }
                yield {"data": json.dumps(payload, ensure_ascii=False)}
        except Exception as exc:
            logger.error("Stream error: %s", exc)
            yield {"data": json.dumps({"error": str(exc)})}

        # 3) done sentinel
        elapsed = int((time.time() - start) * 1000)
        yield {"data": "[DONE]"}
        logger.info("Chat stream completed in %d ms", elapsed)

    return EventSourceResponse(event_generator())


@app.post("/api/chat/sync")
async def chat_sync(req: ChatRequest):
    """Non-streaming chat endpoint."""
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages required")

    user_message = req.messages[-1].content
    history = [{"role": m.role, "content": m.content} for m in req.messages]

    system_prompt = SYSTEM_PROMPT
    sources_payload: list[dict] = []

    if req.use_rag:
        try:
            context_text, sources, _ = await rag_service.build_context(
                user_message, category=req.category
            )
            if context_text:
                system_prompt = rag_service.build_system_prompt(context_text)
                sources_payload = [s.model_dump() for s in sources]
        except Exception as exc:
            logger.warning("RAG retrieval failed: %s", exc)

    ollama_messages = [{"role": "system", "content": system_prompt}] + history
    response_text = await ollama_client.chat(ollama_messages)

    return {
        "response": response_text,
        "sources": sources_payload,
        "metadata": rag_service.stats(),
    }


# ------------------------------------------------------------------
# Image Generation — Pollinations.ai (free, no API key needed)
# ------------------------------------------------------------------

class ImageRequest(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 768
    seed: Optional[int] = None
    model: str = "flux"          # Options: flux, turbo, ghibli, etc.
    nologo: bool = True


class ImageResponse(BaseModel):
    url: str
    prompt: str
    model: str


@app.post("/api/image", response_model=ImageResponse)
async def generate_image(req: ImageRequest):
    """
    Generate an image using Pollinations.ai (completely free, no API key).
    The image URL is returned directly — the browser fetches it from Pollinations.
    """
    # Sanitise and encode the prompt
    clean_prompt = req.prompt.strip()
    if not clean_prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    # Enforce BITS Pilani / educational context relevance (optional guard)
    # You can remove this if you want unrestricted image generation.
    bits_related = any(
        kw in clean_prompt.lower()
        for kw in ["bits", "pilani", "campus", "college", "university",
                   "student", "lab", "research", "goa", "department",
                   "engineering", "computer", "science", "academic", "diagram",
                   "chart", "flowchart", "architecture"]
    )
    if not bits_related:
        raise HTTPException(
            status_code=400,
            detail="Image generation is limited to BITS Pilani / academic topics."
        )

    encoded_prompt = urllib.parse.quote(clean_prompt)
    params = f"width={req.width}&height={req.height}&model={req.model}&nologo={str(req.nologo).lower()}"
    if req.seed is not None:
        params += f"&seed={req.seed}"

    image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?{params}"

    # Verify the URL is reachable (Pollinations generates on first GET)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.head(image_url, follow_redirects=True)
            if resp.status_code not in (200, 302):
                raise HTTPException(status_code=502, detail="Image generation service unavailable")
    except (httpx.TimeoutException, httpx.ConnectError) as e:
        raise HTTPException(status_code=502, detail=f"Could not reach image service: {e}")

    logger.info("[image] Generated: %s", image_url)
    return ImageResponse(url=image_url, prompt=clean_prompt, model=req.model)


@app.get("/api/image")
async def generate_image_get(
    prompt: str,
    width: int = 1024,
    height: int = 768,
    model: str = "flux",
):
    """GET shortcut for image generation (easier to test in browser)."""
    req = ImageRequest(prompt=prompt, width=width, height=height, model=model)
    return await generate_image(req)


@app.post("/api/knowledge/reload")
async def reload_knowledge():
    """Re-scrape BITS Pilani web pages and reload the knowledge base."""
    await load_knowledge_base()
    return {"status": "ok", **rag_service.stats()}


# ------------------------------------------------------------------
# Entrypoint
# ------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
