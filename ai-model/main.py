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

# ─────────────────────────────────────────────────────────────────────────────
# Topic Filter — fast keyword-based guard (runs BEFORE the LLM)
# ─────────────────────────────────────────────────────────────────────────────

# Keywords associated with BITS Pilani / campus topics
BITS_KEYWORDS = {
    # Institution
    "bits", "pilani", "goa", "campus", "college", "university", "institute",
    "birla", "hyderabad", "dubai",
    # Departments & academics
    "csis", "cs", "ece", "eee", "mech", "civil", "pharma", "bio",
    "computer", "science", "engineering", "information", "systems",
    "department", "faculty", "professor", "phd", "mtech", "btech",
    "msc", "research", "lab", "laboratory",
    # Student life
    "student", "course", "semester", "exam", "assignment", "grade", "cgpa",
    "sgpa", "attendance", "hostel", "mess", "canteen", "library", "fest",
    "el", "practice school", "thesis", "dissertation", "project",
    # Admin processes
    "admission", "registration", "fee", "scholarship", "ta", "teaching assistant",
    "reimbursement", "noc", "bonafide", "transcript", "certificate",
    "placement", "internship", "company", "recruit", "package",
    # Specific campus terms
    "smartassist", "smart assist", "assistant", "help", "guide", "about",
    "who", "what", "when", "where", "how", "which", "contact", "email",
    "phone", "office", "timings", "schedule", "timetable", "calendar",
}

OUT_OF_SCOPE_REPLY = (
    "⚠️ **Out of Scope**\n\n"
    "I'm CSIS SmartAssist — I can only answer questions related to "
    "**BITS Pilani Goa** and its departments, academics, faculty, admissions, "
    "placements, research, and student life.\n\n"
    "Your question appears to be outside that scope. "
    "For anything BITS-related, feel free to ask! 😊"
)


def is_bits_related(query: str) -> bool:
    """
    Fast pre-LLM check. Returns True if the query is plausibly about BITS Pilani.
    Short/greeting queries (≤ 6 words) are passed through to avoid false positives.
    """
    q = query.lower().strip()

    # Very short queries / greetings — let the LLM handle them with full context
    word_count = len(q.split())
    if word_count <= 6:
        return True

    # Check if any BITS keyword appears in the query
    for kw in BITS_KEYWORDS:
        if kw in q:
            return True

    return False


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
    return {
        "message": "Campus Smart Guide AI backend is running",
        "version": "2.0.0",
        "docs": "/docs",
    }


@app.get("/api/health", response_model=HealthResponse)
async def health():
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
    """SSE streaming chat endpoint."""
    if not req.messages:
        raise HTTPException(status_code=400, detail="messages required")

    user_message = req.messages[-1].content
    history: list[dict] = [{"role": m.role, "content": m.content} for m in req.messages]

    # ── Pre-LLM topic guard ──────────────────────────────────────────────────
    if not is_bits_related(user_message):
        logger.info("[topic-guard] Rejected out-of-scope query: %r", user_message[:80])

        async def oos_stream():
            meta = {"type": "metadata", "sources": [], "generatedImage": None, "retrieval_ms": 0}
            yield {"data": json.dumps(meta)}
            # Stream the refusal word by word so it looks natural
            for word in OUT_OF_SCOPE_REPLY.split(" "):
                payload = {"choices": [{"delta": {"content": word + " "}}]}
                yield {"data": json.dumps(payload)}
            yield {"data": "[DONE]"}

        return EventSourceResponse(oos_stream())

    # ── RAG retrieval ────────────────────────────────────────────────────────
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

    # ── Build messages for Ollama ────────────────────────────────────────────
    ollama_messages: list[dict] = [{"role": "system", "content": system_prompt}]
    ollama_messages.extend(history)

    # ── SSE generator ────────────────────────────────────────────────────────
    async def event_generator():
        start = time.time()

        meta = {
            "type": "metadata",
            "sources": sources_payload,
            "generatedImage": None,
            "retrieval_ms": retrieval_ms,
        }
        yield {"data": json.dumps(meta, ensure_ascii=False)}

        try:
            async for token in ollama_client.chat_stream(ollama_messages):
                payload = {"choices": [{"delta": {"content": token}}]}
                yield {"data": json.dumps(payload, ensure_ascii=False)}
        except Exception as exc:
            logger.error("Stream error: %s", exc)
            yield {"data": json.dumps({"error": str(exc)})}

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

    if not is_bits_related(user_message):
        return {"response": OUT_OF_SCOPE_REPLY, "sources": [], "metadata": rag_service.stats()}

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
# Image Generation — Pollinations.ai (free, no API key)
# ------------------------------------------------------------------

class ImageRequest(BaseModel):
    prompt: str
    width: int = 1024
    height: int = 768
    seed: Optional[int] = None
    model: str = "flux"
    nologo: bool = True


class ImageResponse(BaseModel):
    url: str
    prompt: str
    model: str


@app.post("/api/image", response_model=ImageResponse)
async def generate_image(req: ImageRequest):
    """Generate an image using Pollinations.ai — free, no API key needed."""
    clean_prompt = req.prompt.strip()
    if not clean_prompt:
        raise HTTPException(status_code=400, detail="prompt is required")

    encoded_prompt = urllib.parse.quote(clean_prompt)
    params = f"width={req.width}&height={req.height}&model={req.model}&nologo={str(req.nologo).lower()}"
    if req.seed is not None:
        params += f"&seed={req.seed}"

    image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?{params}"

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
    req = ImageRequest(prompt=prompt, width=width, height=height, model=model)
    return await generate_image(req)


@app.post("/api/knowledge/reload")
async def reload_knowledge():
    """Re-scrape BITS Pilani pages and reload the knowledge base."""
    await load_knowledge_base()
    return {"status": "ok", **rag_service.stats()}


# ------------------------------------------------------------------
# Entrypoint
# ------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
