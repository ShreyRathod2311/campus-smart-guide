"""
main.py — CSIS SmartAssist FastAPI Orchestrator
================================================
Run:  uvicorn main:app --reload --port 8000

Endpoints:
  POST /chat          → SSE streaming multi-agent response
  GET  /artifacts/{f} → Download generated PPTX / PNG files
  GET  /health        → Health check
"""

import asyncio
import json
import os
import uuid
from pathlib import Path

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv

from agents import AggregatorAgent
from generators import (
    generate_pptx,
    generate_flowchart,
    generate_image,
    detect_pptx_request,
    detect_diagram_request,
    detect_image_request,
    extract_key_points_from_context,
    build_image_prompt,
)

load_dotenv()

ARTIFACTS_DIR = Path(os.getenv("ARTIFACTS_DIR", "./artifacts"))
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# ─────────────────────────────────────────────────────────────────────────────
# App Setup
# ─────────────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="CSIS SmartAssist",
    description="Layered Multi-Agent AI Backend — BITS Pilani Goa",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve artifacts directory (PPTX, PNG files)
app.mount("/artifacts", StaticFiles(directory=str(ARTIFACTS_DIR)), name="artifacts")

aggregator = AggregatorAgent()


# ─────────────────────────────────────────────────────────────────────────────
# Request / Response Models (inline dicts — keeps it simple for hackathon)
# ─────────────────────────────────────────────────────────────────────────────

def _get_base_url(request: Request) -> str:
    """Construct the base URL for serving artifact links."""
    return str(request.base_url).rstrip("/")


# ─────────────────────────────────────────────────────────────────────────────
# /health
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "CSIS SmartAssist Backend",
        "version": "2.0.0",
        "layers": ["ResearcherAgent", "AnalystAgent (Llama-3)", "FinalizerAgent (Gemini)"],
    }


# ─────────────────────────────────────────────────────────────────────────────
# /chat — Main SSE Endpoint
# ─────────────────────────────────────────────────────────────────────────────

@app.post("/chat")
async def chat(request: Request):
    """
    SSE streaming endpoint. Accepts:
        { "messages": [{"role": "user"|"assistant", "content": "..."}] }

    Sends events in this order:
        1. data: {"type":"metadata", "sources":[...], "artifactUrl":"..."}\n\n
        2. data: {"choices":[{"delta":{"content":"..."}}]}\n\n  (repeated)
        3. data: [DONE]\n\n
    """
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    messages: list[dict] = body.get("messages", [])
    if not messages:
        raise HTTPException(status_code=400, detail="'messages' array is required")

    # Extract latest user query
    user_msgs = [m for m in messages if m.get("role") == "user"]
    if not user_msgs:
        raise HTTPException(status_code=400, detail="No user message found")
    latest_query = user_msgs[-1]["content"].strip()

    base_url = _get_base_url(request)

    async def event_stream():
        artifact_url: str | None = None
        generated_image_url: str | None = None

        # ── Step 1: Run Layer 1 + 2 to get context & sources ──────────────────
        ctx, llm_stream = await aggregator.run(latest_query, history=messages)

        # ── Step 2: Artifact / Image Generation ───────────────────────────────
        wants_pptx    = detect_pptx_request(latest_query)
        wants_diagram = detect_diagram_request(latest_query)
        wants_image   = detect_image_request(latest_query)

        if wants_pptx and ctx.raw_context:
            # ── PPTX: generate slide deck ──────────────────────────────────────
            try:
                key_points = extract_key_points_from_context(ctx.raw_context, max_points=10)
                if key_points:
                    fname = f"slides_{uuid.uuid4().hex[:8]}"
                    title = latest_query[:60].title()
                    file_path = await asyncio.to_thread(generate_pptx, title, key_points, fname)
                    artifact_filename = Path(file_path).name
                    artifact_url = f"{base_url}/artifacts/{artifact_filename}"
                    print(f"[main] PPTX artifact: {artifact_url}")
            except Exception as e:
                print(f"[main] PPTX generation failed: {e}")

        elif wants_image or wants_diagram:
            # ── IMAGE: Gemini Imagen → DALL-E → Pollinations → SVG fallback ───────
            try:
                img_steps = None
                if ctx.raw_context:
                    img_steps = extract_key_points_from_context(ctx.raw_context, max_points=7)
                if not img_steps:
                    img_steps = [
                        "Submit Application", "Department Review",
                        "HOD Approval", "Finance Processing", "Completion",
                    ]
                img_prompt = build_image_prompt(latest_query, ctx.raw_context or "")
                img_path = await generate_image(img_prompt, steps=img_steps)
                if img_path:
                    img_filename = Path(img_path).name
                    generated_image_url = f"{base_url}/artifacts/{img_filename}"
                    artifact_url = generated_image_url
                    print(f"[main] Image artifact: {generated_image_url}")
            except Exception as e:
                print(f"[main] Image generation failed: {e}")

        # ── Step 3: Send Metadata SSE Event ───────────────────────────────────
        metadata = {
            "type": "metadata",
            "sources": [s.to_dict() for s in ctx.sources],
            "generatedImage": generated_image_url,   # shown inline in chat
            "artifactUrl": artifact_url,              # shown as download card
            "analystNotes": ctx.analyst_notes or None,
        }
        yield f"data: {json.dumps(metadata)}\n\n"

        # ── Step 4: Stream Gemini response (Layer 3) ──────────────────────────
        async for chunk in llm_stream:
            payload = json.dumps({
                "choices": [{"delta": {"content": chunk}}]
            })
            yield f"data: {payload}\n\n"

        # ── Step 5: Done ───────────────────────────────────────────────────────
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# /artifacts/<filename> — Download generated files
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/artifacts/{filename}")
async def get_artifact(filename: str):
    """Serve a generated artifact (PPTX or PNG) for download."""
    file_path = ARTIFACTS_DIR / filename

    # Security: prevent path traversal
    try:
        file_path.resolve().relative_to(ARTIFACTS_DIR.resolve())
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid filename")

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Artifact '{filename}' not found")

    media_type = (
        "application/vnd.openxmlformats-officedocument.presentationml.presentation"
        if filename.endswith(".pptx")
        else "image/svg+xml" if filename.endswith(".svg")
        else "image/png"
    )

    return FileResponse(
        path=str(file_path),
        filename=filename,
        media_type=media_type,
    )


# ─────────────────────────────────────────────────────────────────────────────
# Entry Point
# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
