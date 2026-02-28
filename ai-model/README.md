# Campus Smart Guide – AI Backend (Python)

A **FastAPI** backend that wraps **Ollama** for local LLM chat with **RAG** (Retrieval-Augmented Generation) over campus knowledge documents.

## Directory structure

```
ai-model/
├── app/
│   ├── __init__.py
│   ├── config.py            # Ollama & RAG settings
│   ├── models.py            # Pydantic request/response schemas
│   ├── ollama_client.py     # Async Ollama HTTP client
│   ├── vector_store.py      # In-memory cosine-similarity store
│   ├── document_processor.py# Sentence-based chunker
│   ├── rag_service.py       # Retrieval + context builder
│   └── knowledge_base.py    # Campus docs loader
├── main.py                  # FastAPI application
├── requirements.txt
└── Dockerfile
```

## Quickstart (without Docker)

```bash
# 1. Make sure Ollama is running with the required models
ollama pull llama3.2
ollama pull nomic-embed-text

# 2. Install Python dependencies
cd ai-model
pip install -r requirements.txt

# 3. Run the server
uvicorn main:app --reload --port 8000
```

The frontend dev server proxies `/api` → `http://localhost:8000` automatically.

## Quickstart (Docker – recommended)

From the **project root**:

```bash
docker compose up --build
```

This starts three services:

| Service   | Port  | Description                 |
| --------- | ----- | --------------------------- |
| frontend  | 3000  | React app served by nginx   |
| backend   | 8000  | Python FastAPI + RAG        |
| ollama    | 11434 | Ollama LLM server           |

On first run the `ollama-setup` container pulls `llama3.2` and `nomic-embed-text`.

## API endpoints

| Method | Path                   | Description                     |
| ------ | ---------------------- | ------------------------------- |
| GET    | `/api/health`          | Health check + model status     |
| POST   | `/api/chat`            | SSE streaming chat (with RAG)   |
| POST   | `/api/chat/sync`       | Non-streaming chat              |
| POST   | `/api/knowledge/reload`| Reload knowledge base           |

### POST `/api/chat` body

```json
{
  "messages": [
    { "role": "user", "content": "How do I apply to be a TA?" }
  ],
  "use_rag": true,
  "category": null
}
```

Response is an **SSE stream** compatible with the existing frontend parser.

## Environment variables

| Variable                | Default                    |
| ----------------------- | -------------------------- |
| `OLLAMA_BASE_URL`       | `http://ollama:11434`      |
| `OLLAMA_MODEL`          | `llama3.2`                 |
| `OLLAMA_EMBEDDING_MODEL`| `nomic-embed-text`         |

## GPU acceleration

Uncomment the `deploy.resources` block under the `ollama` service in `docker-compose.yml` to enable NVIDIA GPU pass-through.
