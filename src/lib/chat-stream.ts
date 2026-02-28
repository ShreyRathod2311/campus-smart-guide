import { streamChatLocal, isLocalAIAvailable } from './chat-stream-local';

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

export type Msg = { 
  role: "user" | "assistant"; 
  content: string;
  sources?: SourceDoc[];
  generatedImage?: string | null;
};

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;
const USE_LOCAL_AI = import.meta.env.VITE_USE_LOCAL_AI === 'true';

export async function streamChat({
  messages,
  onDelta,
  onDone,
  onError,
  onMetadata,
}: {
  messages: Msg[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  onMetadata?: (metadata: ChatMetadata) => void;
}) {
  // Try local AI first if enabled
  if (USE_LOCAL_AI) {
    try {
      const isAvailable = await isLocalAIAvailable();
      if (isAvailable) {
        console.log('Using local AI model (Ollama)...');
        await streamChatLocal({
          messages,
          onDelta,
          onDone,
          onError,
          onMetadata,
        });
        return;
      } else {
        console.warn('Local AI not available, falling back to remote API...');
      }
    } catch (error) {
      console.error('Local AI error, falling back to remote API:', error);
    }
  }

  // Fallback to remote API
  await streamChatRemote({ messages, onDelta, onDone, onError, onMetadata });
}

async function streamChatRemote({
  messages,
  onDelta,
  onDone,
  onError,
  onMetadata,
}: {
  messages: Msg[];
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  onMetadata?: (metadata: ChatMetadata) => void;
}) {
  const resp = await fetch(CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
    },
    body: JSON.stringify({ messages: messages.map(m => ({ role: m.role, content: m.content })) }),
  });

  if (resp.status === 429) {
    onError("Rate limit exceeded. Please wait a moment and try again.");
    return;
  }
  if (resp.status === 402) {
    onError("AI usage limit reached. Please add credits to continue.");
    return;
  }
  if (!resp.ok || !resp.body) {
    onError("Failed to connect to SmartAssist. Please try again.");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        
        // Handle metadata event
        if (parsed.type === "metadata") {
          if (onMetadata) {
            onMetadata({
              sources: parsed.sources || [],
              generatedImage: parsed.generatedImage || null,
            });
          }
          continue;
        }
        
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        
        // Handle metadata event in final flush
        if (parsed.type === "metadata") {
          if (onMetadata) {
            onMetadata({
              sources: parsed.sources || [],
              generatedImage: parsed.generatedImage || null,
            });
          }
          continue;
        }
        
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}
