"""
database.py — Layer 1 data retrieval utilities for CSIS SmartAssist.
Provides async functions to search the Supabase vector DB and SQL tables.
"""

import asyncio
import os
from dataclasses import dataclass
from typing import Optional

import httpx
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")


@dataclass
class SourceDoc:
    id: str
    title: str
    category: str
    source: Optional[str]
    content: str
    similarity: Optional[int] = None

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "source": self.source,
            "similarity": self.similarity,
        }


def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env")
    return create_client(SUPABASE_URL, SUPABASE_KEY)


async def get_embedding(text: str) -> Optional[list[float]]:
    """Fetch OpenAI text embeddings. Returns None if OPENAI_API_KEY is not set."""
    if not OPENAI_API_KEY:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                "https://api.openai.com/v1/embeddings",
                headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                json={"model": "text-embedding-3-small", "input": text},
            )
            resp.raise_for_status()
            return resp.json()["data"][0]["embedding"]
    except Exception as e:
        print(f"[database] Embedding error: {e}")
        return None


async def vector_search(query: str, supabase: Client) -> list[SourceDoc]:
    """Run pgvector similarity search in Supabase."""
    embedding = await get_embedding(query)
    if not embedding:
        return []
    try:
        result = supabase.rpc(
            "match_campus_documents",
            {"query_embedding": embedding, "match_threshold": 0.5, "match_count": 4},
        ).execute()
        docs = result.data or []
        return [
            SourceDoc(
                id=d["id"],
                title=d["title"],
                category=d["category"],
                source=d.get("source"),
                content=d["content"],
                similarity=round(d["similarity"] * 100),
            )
            for d in docs
        ]
    except Exception as e:
        print(f"[database] Vector search error: {e}")
        return []


async def keyword_search(query: str, supabase: Client) -> list[SourceDoc]:
    """Keyword fallback: score documents by matching query terms."""
    try:
        result = supabase.table("campus_documents").select(
            "id, title, content, category, source, tags"
        ).eq("is_active", True).limit(10).execute()
        docs = result.data or []
        keywords = [w for w in query.lower().split() if len(w) > 2]

        scored = []
        for doc in docs:
            searchable = (
                doc["content"] + " " + doc["title"] + " " + " ".join(doc.get("tags") or [])
            ).lower()
            score = sum(1 for k in keywords if k in searchable)
            if score > 0:
                scored.append((score, doc))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            SourceDoc(
                id=d["id"],
                title=d["title"],
                category=d["category"],
                source=d.get("source"),
                content=d["content"],
            )
            for _, d in scored[:4]
        ]
    except Exception as e:
        print(f"[database] Keyword search error: {e}")
        return []


async def sql_structured_search(query: str, supabase: Client) -> list[SourceDoc]:
    """
    Search structured SQL tables for BITS Goa facts.
    Expands to whichever tables you have — add more as needed.
    Currently queries: campus_documents (category filter), bookings summary.
    """
    results: list[SourceDoc] = []
    try:
        # Example: scan  for category-matched rows (simulating an SQL data layer)
        category_map = {
            "ta": "TA Policy",
            "reimbursement": "Finance",
            "lab": "Lab Booking",
            "exam": "Academics",
            "schedule": "Academics",
        }
        matched_category = None
        for kw, cat in category_map.items():
            if kw in query.lower():
                matched_category = cat
                break

        if matched_category:
            result = (
                supabase.table("campus_documents")
                .select("id, title, content, category, source")
                .eq("category", matched_category)
                .eq("is_active", True)
                .limit(3)
                .execute()
            )
            for d in result.data or []:
                results.append(
                    SourceDoc(
                        id=d["id"],
                        title=d["title"],
                        category=d["category"],
                        source=d.get("source"),
                        content=d["content"],
                    )
                )
    except Exception as e:
        print(f"[database] SQL structured search error: {e}")
    return results


async def search_all(query: str) -> tuple[list[SourceDoc], str]:
    """
    Run vector search and SQL search in parallel (asyncio.gather).
    Deduplicates by doc id. Returns (sources, combined_context_string).
    """
    supabase = get_supabase()

    # Layer 1: parallel data retrieval
    vec_results, sql_results = await asyncio.gather(
        vector_search(query, supabase),
        sql_structured_search(query, supabase),
    )

    # Fallback to keyword search only if both returned empty
    if not vec_results and not sql_results:
        vec_results = await keyword_search(query, supabase)

    # Merge & deduplicate
    seen_ids: set[str] = set()
    merged: list[SourceDoc] = []
    for doc in vec_results + sql_results:
        if doc.id not in seen_ids:
            seen_ids.add(doc.id)
            merged.append(doc)

    # Build context string for LLM consumption
    context_parts = []
    for doc in merged:
        sim_txt = f", Relevance: {doc.similarity}%" if doc.similarity else ""
        context_parts.append(
            f"**{doc.title}** [{doc.category}{sim_txt}]\n"
            f"{doc.content}\n"
            f"Source: {doc.source or 'campus_documents table'}"
        )
    context = "\n\n---\n\n".join(context_parts)

    return merged, context
