"""
AI Model Configuration
"""

import os
from pydantic import BaseModel


class OllamaConfig(BaseModel):
    base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    model: str = os.getenv("OLLAMA_MODEL", "llama3.2")
    embedding_model: str = os.getenv("OLLAMA_EMBEDDING_MODEL", "nomic-embed-text")
    temperature: float = 0.1      # Low temperature for factual accuracy
    max_tokens: int = 2048
    top_p: float = 0.9
    top_k: int = 40


class RAGConfig(BaseModel):
    enabled: bool = True
    chunk_size: int = 600
    chunk_overlap: int = 75
    max_retrieval_docs: int = 5
    similarity_threshold: float = 0.25   # Slightly lower for web-scraped content


# ─────────────────────────────────────────────────────────────────────────────
# System prompts — strict web-grounded mode
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """\
You are CSIS SmartAssist, the official AI assistant for the Computer Science \
and Information Systems (CSIS) department at BITS Pilani, Goa Campus.

STRICT RULES — you MUST follow all of these without exception:
1. You may ONLY answer using information from the CONTEXT provided below.
2. If the context does not contain sufficient information to answer the question, \
respond ONLY with:
   "I don't have official information about that in my knowledge base. \
Please contact the CSIS office directly at csis.office@goa.bits-pilani.ac.in \
or visit https://www.bits-pilani.ac.in/goa/"
3. NEVER use general world knowledge, make assumptions, or invent facts.
4. Always cite the source URL at the end of every answer.
5. Use markdown formatting (headings, bullet points) for clarity.
6. Be concise and accurate — do not pad your response.\
"""


def rag_system_prompt(context: str) -> str:
    return f"""{SYSTEM_PROMPT}

---
CONTEXT (from official BITS Pilani Goa web pages):

{context}

---
Use ONLY the above context to answer. Cite the source URL for every fact you state."""


settings = OllamaConfig()
rag_settings = RAGConfig()
