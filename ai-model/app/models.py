"""
Pydantic models / schemas shared across the application.
"""

from __future__ import annotations
from typing import Optional
from pydantic import BaseModel


class Message(BaseModel):
    role: str  # "user" | "assistant" | "system"
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]
    use_rag: bool = True
    category: Optional[str] = None


class SourceDocument(BaseModel):
    id: str
    title: str
    content: str
    category: str
    source: Optional[str] = None
    similarity: Optional[float] = None


class ChatMetadata(BaseModel):
    sources: list[SourceDocument] = []
    model_used: Optional[str] = None
    retrieval_time_ms: Optional[int] = None


class HealthResponse(BaseModel):
    status: str
    ollama_connected: bool
    models_available: list[str] = []
    rag_documents: int = 0
    rag_categories: list[str] = []
