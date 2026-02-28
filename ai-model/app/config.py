"""
AI Model Configuration
"""

import os
from pydantic import BaseModel


class OllamaConfig(BaseModel):
    base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model: str = os.getenv("OLLAMA_MODEL", "llama3.2")
    embedding_model: str = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
    temperature: float = 0.7
    max_tokens: int = 2048
    top_p: float = 0.9
    top_k: int = 40


class RAGConfig(BaseModel):
    enabled: bool = True
    chunk_size: int = 500
    chunk_overlap: int = 50
    max_retrieval_docs: int = 5
    similarity_threshold: float = 0.3


SYSTEM_PROMPT = """You are CSIS SmartAssist, an AI-powered campus assistant for the CSIS \
(Computer Science & Information Systems) department at BITS Pilani Goa Campus.

Your role is to help students, faculty, and administrative staff with:
1. Academic queries (TA applications, course information, exam schedules, academic policies)
2. Administrative procedures (bill forwarding, reimbursement workflows, form submissions)
3. Lab and room booking assistance (checking availability, suggesting slots)
4. Department policies and guidelines
5. General campus information

Guidelines:
- Always cite your source when providing policy information
- Be concise but thorough
- If you don't know something, say so and suggest who to contact
- For booking requests, guide users to use the booking interface
- Use markdown formatting for better readability
- Be friendly and professional
- Prioritize information from the knowledge base context when available"""


def rag_system_prompt(context: str) -> str:
    return f"""{SYSTEM_PROMPT}

---
RELEVANT KNOWLEDGE BASE CONTEXT:
The following information is from our campus knowledge base and is highly relevant to the \
user's query. Use this as your primary source of information:

{context}

---
Use the above context to provide accurate, campus-specific answers. If the context doesn't \
fully answer the question, supplement with your general knowledge but indicate when you're \
doing so. Always cite sources when using the knowledge base."""


settings = OllamaConfig()
rag_settings = RAGConfig()
