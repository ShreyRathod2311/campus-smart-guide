"""
agents.py — Layered Multi-Agent Architecture for CSIS SmartAssist

Layers:
  1. ResearcherAgent  — Searches Supabase vector DB and SQL tables in parallel
  2. AnalystAgent     — Uses Llama-3 (Ollama) to flag policy contradictions
  3. FinalizerAgent   — Uses Gemini 2.0 Flash to synthesize a strict, cited answer

Each agent can be tested independently:
    python -c "import asyncio; from agents import ResearcherAgent; ..."
"""

import asyncio
import json
import os
from dataclasses import dataclass, field
from typing import Optional, AsyncIterator

import httpx
from dotenv import load_dotenv

import database as db

load_dotenv()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ─────────────────────────────────────────────────────────────────────────────
# Shared result type passed from layer to layer
# ─────────────────────────────────────────────────────────────────────────────

@dataclass
class AgentContext:
    query: str
    sources: list[db.SourceDoc] = field(default_factory=list)
    raw_context: str = ""
    analyst_notes: str = ""          # contradiction flags from Layer 2
    history: list[dict] = field(default_factory=list)  # chat history


# ─────────────────────────────────────────────────────────────────────────────
# Layer 1 — ResearcherAgent
# ─────────────────────────────────────────────────────────────────────────────

class ResearcherAgent:
    """
    Layer 1: Fetches relevant documents from Supabase (vector + SQL) in parallel.
    Completely independent — can be called without Layer 2 or 3.
    """

    async def run(self, query: str, history: list[dict] | None = None) -> AgentContext:
        print(f"[ResearcherAgent] Searching for: {query!r}")
        sources, context = await db.search_all(query)
        print(f"[ResearcherAgent] Found {len(sources)} source(s)")
        return AgentContext(
            query=query,
            sources=sources,
            raw_context=context,
            history=history or [],
        )


# ─────────────────────────────────────────────────────────────────────────────
# Layer 2 — AnalystAgent
# ─────────────────────────────────────────────────────────────────────────────

class AnalystAgent:
    """
    Layer 2: Sends the retrieved context to Ollama/Llama-3 and asks it to:
      - Identify contradictions between sources
      - Flag if context is insufficient

    Gracefully skips if Ollama is unreachable — Layer 3 still proceeds.
    Can be tested independently:
        asyncio.run(AnalystAgent().run(ctx))
    """

    SYSTEM_PROMPT = (
        "You are a policy analyst for BITS Pilani Goa's CSIS department. "
        "Given the following retrieved documents, your ONLY task is to:\n"
        "1. Identify any contradictions or conflicts between the documents.\n"
        "2. Flag if the documents are insufficient to answer the query.\n"
        "3. Note the most relevant document title/source.\n"
        "Respond in 2-3 concise sentences. Do NOT answer the user query directly."
    )

    async def run(self, ctx: AgentContext) -> AgentContext:
        if not ctx.raw_context:
            ctx.analyst_notes = "No context retrieved — answer likely unavailable."
            return ctx

        prompt = (
            f"User query: {ctx.query}\n\n"
            f"Retrieved context:\n{ctx.raw_context[:3000]}"
        )

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                resp = await client.post(
                    f"{OLLAMA_BASE_URL}/api/chat",
                    json={
                        "model": "llama3",
                        "stream": False,
                        "messages": [
                            {"role": "system", "content": self.SYSTEM_PROMPT},
                            {"role": "user", "content": prompt},
                        ],
                    },
                )
                resp.raise_for_status()
                notes = resp.json().get("message", {}).get("content", "").strip()
                ctx.analyst_notes = notes
                print(f"[AnalystAgent] Notes: {notes[:120]}...")
        except httpx.ConnectError:
            print("[AnalystAgent] Ollama not reachable — skipping Layer 2")
            ctx.analyst_notes = ""
        except Exception as e:
            print(f"[AnalystAgent] Error: {e}")
            ctx.analyst_notes = ""

        return ctx


# ─────────────────────────────────────────────────────────────────────────────
# Layer 3 — FinalizerAgent
# ─────────────────────────────────────────────────────────────────────────────

STRICT_SYSTEM_PROMPT = """\
You are CSIS SmartAssist, the official AI assistant for the CSIS (Computer Science & Information Systems) department at BITS Pilani Goa.

HARD RULES — violating these disqualifies your response:
1. You MUST cite the exact PDF filename or SQL table/column name for EVERY factual claim you make (e.g., "Source: ta_guidelines_2025.pdf" or "Source: campus_documents table, TA Policy category").
2. If the provided CONTEXT DOCUMENTS do not contain sufficient information to answer the query, you MUST respond ONLY with:
   "I do not have the official BITS Goa documentation for this. Please contact the CSIS office directly."
3. NEVER use general world knowledge or make assumptions beyond what is in the CONTEXT DOCUMENTS.
4. Use markdown formatting (headers, bullet points) for clarity.
5. Be concise but complete — do not pad your answer.

FORMAT:
- Start with a direct answer
- Use bullet points for steps/lists
- End with "📄 Source: <filename or table>" for each cited fact
"""

class FinalizerAgent:
    """
    Layer 3: Synthesizes the final answer using Gemini 2.0 Flash.
    Enforces strict citation guardrails via the hard-coded system prompt.
    Returns an async generator of text chunks for SSE streaming.

    Can be tested independently:
        async for chunk in FinalizerAgent().stream(ctx): print(chunk, end="")
    """

    async def stream(self, ctx: AgentContext) -> AsyncIterator[str]:
        if not GEMINI_API_KEY:
            yield "⚠️ GEMINI_API_KEY is not configured. Please set it in backend/.env"
            return

        # Compose the user message with all retrieved context
        user_content = f"User Query: {ctx.query}\n\n"

        if ctx.raw_context:
            user_content += f"CONTEXT DOCUMENTS:\n{ctx.raw_context}\n\n"
        else:
            user_content += "CONTEXT DOCUMENTS: [None retrieved]\n\n"

        if ctx.analyst_notes:
            user_content += f"ANALYST NOTES (contradiction check):\n{ctx.analyst_notes}\n\n"

        user_content += "Please answer the user query strictly following the HARD RULES above."

        # Build messages list (include chat history for multi-turn)
        messages = []
        for msg in ctx.history[:-1]:  # exclude latest user message (already in user_content)
            messages.append({"role": msg["role"], "parts": [{"text": msg["content"]}]})
        messages.append({"role": "user", "parts": [{"text": user_content}]})

        url = (
            f"https://generativelanguage.googleapis.com/v1beta/models/"
            f"gemini-2.0-flash:streamGenerateContent?alt=sse&key={GEMINI_API_KEY}"
        )
        payload = {
            "system_instruction": {"parts": [{"text": STRICT_SYSTEM_PROMPT}]},
            "contents": messages,
            "generationConfig": {"temperature": 0.1, "maxOutputTokens": 2048},
        }

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream("POST", url, json=payload) as resp:
                    resp.raise_for_status()
                    async for line in resp.aiter_lines():
                        line = line.strip()
                        if not line.startswith("data:"):
                            continue
                        json_str = line[5:].strip()
                        if not json_str or json_str == "[DONE]":
                            continue
                        try:
                            data = json.loads(json_str)
                            text = (
                                data.get("candidates", [{}])[0]
                                .get("content", {})
                                .get("parts", [{}])[0]
                                .get("text", "")
                            )
                            if text:
                                yield text
                        except json.JSONDecodeError:
                            continue
        except httpx.HTTPStatusError as e:
            print(f"[FinalizerAgent] Gemini HTTP error: {e.response.status_code}")
            yield f"\n\n⚠️ Gemini API error ({e.response.status_code}). Check your GEMINI_API_KEY."
        except Exception as e:
            print(f"[FinalizerAgent] Error: {e}")
            yield f"\n\n⚠️ An error occurred while generating the response: {e}"


# ─────────────────────────────────────────────────────────────────────────────
# AggregatorAgent — Orchestrates all 3 layers
# ─────────────────────────────────────────────────────────────────────────────

class AggregatorAgent:
    """
    Orchestrates the full pipeline:
      Layer 1 → Layer 2 (parallel where possible) → Layer 3 (streaming)

    Layer 1 and Layer 2 preparation run concurrently where applicable.
    """

    def __init__(self):
        self.researcher = ResearcherAgent()
        self.analyst = AnalystAgent()
        self.finalizer = FinalizerAgent()

    async def run(
        self,
        query: str,
        history: list[dict] | None = None,
    ) -> tuple[AgentContext, AsyncIterator[str]]:
        """
        Returns (ctx, stream) where:
          - ctx contains sources and analyst notes (available before streaming starts)
          - stream is an async iterator of text chunks from Gemini

        Usage in FastAPI:
            ctx, stream = await aggregator.run(query, history)
            # send ctx.sources as metadata SSE event
            async for chunk in stream:
                # send chunk as SSE data event
        """
        # Layer 1: Research (await — need results before Layer 2)
        ctx = await self.researcher.run(query, history)

        # Layer 2: Analyst (await — need notes before Layer 3)
        ctx = await self.analyst.run(ctx)

        # Layer 3: Finalizer returns an async generator (streaming)
        stream = self.finalizer.stream(ctx)

        return ctx, stream
