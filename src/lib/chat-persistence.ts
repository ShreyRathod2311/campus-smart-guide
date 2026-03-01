/**
 * Chat Persistence Service
 * Handles saving/loading conversations and messages to/from Supabase.
 */
import { supabase } from "@/integrations/supabase/client";
import type { Msg } from "./chat-stream";

export interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  user_id: string | null;
  /** first message preview (populated client-side) */
  preview?: string;
}

export interface PersistedMessage {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sources: string[] | null;
  created_at: string;
}

// ─── Conversations ──────────────────────────────────────────

/** Fetch all conversations for the current user, newest first. */
export async function listConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listConversations error:", error);
    return [];
  }
  return data as Conversation[];
}

/** Create a new conversation and return it. */
export async function createConversation(title?: string): Promise<Conversation | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("conversations")
    .insert({ title: title ?? "New Chat", user_id: user.id })
    .select()
    .single();

  if (error) {
    console.error("createConversation error:", error);
    return null;
  }
  return data as Conversation;
}

/** Update the title of a conversation (e.g. auto-title from first message). */
export async function updateConversationTitle(
  conversationId: string,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .update({ title })
    .eq("id", conversationId);

  if (error) console.error("updateConversationTitle error:", error);
}

/** Delete a conversation (cascades to messages). */
export async function deleteConversation(conversationId: string): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);

  if (error) console.error("deleteConversation error:", error);
}

// ─── Messages ───────────────────────────────────────────────

/** Fetch all messages for a conversation, oldest first. */
export async function loadMessages(conversationId: string): Promise<Msg[]> {
  console.log(`[chat-persistence] loading messages for conv ${conversationId.slice(0, 8)}…`);

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("loadMessages error:", error);
    return [];
  }

  const msgs = (data as PersistedMessage[]).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
    sources: m.sources
      ? m.sources.map((s) => {
          try {
            return JSON.parse(s);
          } catch {
            return { id: "", title: s, category: "", source: null };
          }
        })
      : undefined,
  }));

  console.log(`[chat-persistence] loaded ${msgs.length} messages (${msgs.filter(m => m.role === 'user').length} user, ${msgs.filter(m => m.role === 'assistant').length} assistant)`);
  return msgs;
}

/** Save a single message to a conversation. Returns true on success. */
export async function saveMessage(
  conversationId: string,
  msg: Msg
): Promise<boolean> {
  const sourcesJson = msg.sources
    ? msg.sources.map((s) => JSON.stringify(s))
    : null;

  console.log(`[chat-persistence] saving ${msg.role} message to conv ${conversationId.slice(0, 8)}…`);

  const { error } = await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: msg.role,
    content: msg.content,
    sources: sourcesJson,
  });

  if (error) {
    console.error("saveMessage error:", error);
    return false;
  }
  console.log(`[chat-persistence] ${msg.role} message saved ✓`);
  return true;
}

/** Derive a short title from the first user message. */
export function deriveTitle(content: string): string {
  const trimmed = content.trim();
  if (trimmed.length <= 40) return trimmed;
  return trimmed.slice(0, 37) + "...";
}
