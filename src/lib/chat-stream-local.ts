/**
 * Local Chat Stream Adapter
 * Calls the Python FastAPI backend (Ollama + RAG) over SSE.
 */

export interface SourceDoc {
  id: string;
  title: string;
  category: string;
  source: string | null;
  similarity?: number;
}

export interface ChatMetadata {
  sources: SourceDoc[];
  generatedImage: string | null;
}

export interface Msg {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceDoc[];
  generatedImage?: string | null;
}

export interface StreamChatOptions {
  messages: Msg[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  onMetadata?: (metadata: ChatMetadata) => void;
}

// Backend base URL – in Docker nginx proxies /api → backend:8000
// In dev, vite proxy does the same.  Fallback to localhost:8000.
const API_BASE =
  import.meta.env.VITE_AI_BACKEND_URL ?? '/api';

/**
 * Stream chat via the Python backend SSE endpoint.
 */
export async function streamChatLocal(options: StreamChatOptions): Promise<void> {
  const { messages, onDelta, onDone, onError, onMetadata } = options;

  try {
    const resp = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        use_rag: true,
      }),
    });

    if (!resp.ok || !resp.body) {
      onError(`AI backend returned ${resp.status}`);
      return;
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buf.indexOf('\n')) !== -1) {
        let line = buf.slice(0, idx);
        buf = buf.slice(idx + 1);
        if (line.endsWith('\r')) line = line.slice(0, -1);
        if (line.startsWith(':') || line.trim() === '') continue;
        if (!line.startsWith('data: ')) continue;

        const payload = line.slice(6).trim();
        if (payload === '[DONE]') {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(payload);

          // metadata event
          if (parsed.type === 'metadata') {
            onMetadata?.({
              sources: parsed.sources ?? [],
              generatedImage: parsed.generatedImage ?? null,
            });
            continue;
          }

          // token event
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) onDelta(content);
        } catch {
          buf = line + '\n' + buf;
          break;
        }
      }
    }

    onDone();
  } catch (error) {
    console.error('Local chat stream error:', error);
    onError(error instanceof Error ? error.message : 'Unknown error');
  }
}

/**
 * Check if the Python AI backend is reachable.
 */
export async function isLocalAIAvailable(): Promise<boolean> {
  try {
    const resp = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    if (!resp.ok) return false;
    const data = await resp.json();
    return data.ollama_connected === true;
  } catch {
    return false;
  }
}

/**
 * Get backend status.
 */
export async function getLocalAIStatus() {
  try {
    const resp = await fetch(`${API_BASE}/health`);
    const data = await resp.json();
    return {
      ollamaStatus: data.ollama_connected,
      modelsAvailable: data.models_available ?? [],
      ragEnabled: (data.rag_documents ?? 0) > 0,
      knowledgeBaseStats: {
        totalDocuments: data.rag_documents ?? 0,
        categories: data.rag_categories ?? [],
      },
    };
  } catch (error) {
    return {
      ollamaStatus: false,
      modelsAvailable: [],
      ragEnabled: false,
      knowledgeBaseStats: { totalDocuments: 0, categories: [] },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
