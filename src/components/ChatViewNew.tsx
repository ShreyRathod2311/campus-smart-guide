import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Sparkles,
  BookOpen,
  HelpCircle,
  CalendarPlus,
  FileText,
  ChevronDown,
  ChevronUp,
  Plus,
  MessageSquare,
  Trash2,
  Search,
  MoreHorizontal,
  Square,
  GraduationCap,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Msg, SourceDoc, ChatMetadata, streamChat } from "@/lib/chat-stream";
import {
  Conversation,
  listConversations,
  createConversation,
  updateConversationTitle,
  deleteConversation,
  loadMessages,
  saveMessage,
  deriveTitle,
} from "@/lib/chat-persistence";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

/* ────────── Suggestion chips (Gemini-style) ────────── */
const SUGGESTIONS = [
  {
    label: "Book a Lab",
    desc: "Reserve a lab or seminar hall",
    icon: CalendarPlus,
    prompt: "I want to book a lab",
  },
  {
    label: "TA Application",
    desc: "Learn how to apply for TA",
    icon: BookOpen,
    prompt: "How do I apply for a TA position?",
  },
  {
    label: "Reimbursement",
    desc: "Bill reimbursement process",
    icon: HelpCircle,
    prompt: "What is the process for bill reimbursement?",
  },
  {
    label: "Policies",
    desc: "Department policies & rules",
    icon: Sparkles,
    prompt: "Tell me about department policies",
  },
];

/* ────────── Sources accordion ────────── */
function SourcesSection({ sources }: { sources: SourceDoc[] }) {
  const [open, setOpen] = useState(false);
  if (!sources?.length) return null;

  return (
    <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700/60">
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors"
      >
        <FileText size={12} />
        Sources ({sources.length})
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 animate-fade-in">
          {sources.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded-lg bg-neutral-100 dark:bg-neutral-800 px-3 py-2 text-xs"
            >
              <FileText size={13} className="text-blue-500 shrink-0" />
              <span className="truncate font-medium">{s.title}</span>
              <span className="shrink-0 rounded bg-neutral-200 dark:bg-neutral-700 px-1.5 py-0.5 text-[10px]">
                {s.category}
              </span>
              {s.similarity != null && (
                <span className="ml-auto shrink-0 text-green-600 dark:text-green-400 text-[10px]">
                  {Math.round(s.similarity * 100)}%
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   GEMINI-STYLE CHAT HISTORY SIDEBAR
   ════════════════════════════════════════════════════════════ */
function ChatHistorySidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const filtered = search
    ? conversations.filter((c) =>
        (c.title || "").toLowerCase().includes(search.toLowerCase())
      )
    : conversations;

  /* group by date */
  const today = new Date();
  const todayStr = today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toDateString();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const groups: { label: string; items: Conversation[] }[] = [];
  const buckets: Record<string, Conversation[]> = {
    Today: [],
    Yesterday: [],
    "Previous 7 Days": [],
    Older: [],
  };
  for (const c of filtered) {
    const d = new Date(c.created_at);
    const ds = d.toDateString();
    if (ds === todayStr) buckets.Today.push(c);
    else if (ds === yStr) buckets.Yesterday.push(c);
    else if (d >= sevenDaysAgo) buckets["Previous 7 Days"].push(c);
    else buckets.Older.push(c);
  }
  for (const label of ["Today", "Yesterday", "Previous 7 Days", "Older"]) {
    if (buckets[label].length) groups.push({ label, items: buckets[label] });
  }

  const startEditing = (c: Conversation) => {
    setEditingId(c.id);
    setEditTitle(c.title || "");
    setMenuOpenId(null);
  };

  const confirmRename = (id: string) => {
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <div className="w-[260px] shrink-0 h-full flex flex-col bg-neutral-50 dark:bg-neutral-950 border-r border-neutral-200 dark:border-neutral-800">
      {/* New chat button */}
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full flex items-center gap-2.5 rounded-full border border-neutral-300 dark:border-neutral-700 px-4 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800/70 transition-colors"
        >
          <Plus size={18} />
          New chat
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats..."
            className="w-full rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-8 pr-3 py-1.5 text-xs text-neutral-700 dark:text-neutral-300 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
        {filtered.length === 0 && (
          <p className="text-xs text-neutral-400 text-center mt-8">
            {search ? "No matching chats" : "No conversations yet"}
          </p>
        )}
        {groups.map((g) => (
          <div key={g.label} className="mt-4 first:mt-1">
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {g.label}
            </p>
            {g.items.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  if (editingId !== c.id) onSelect(c.id);
                }}
                className={cn(
                  "group relative flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer text-[13px] transition-colors",
                  c.id === activeId
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium"
                    : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/60"
                )}
              >
                <MessageSquare size={14} className="shrink-0 opacity-60" />

                {editingId === c.id ? (
                  <div className="flex-1 flex items-center gap-1 min-w-0">
                    <input
                      autoFocus
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") confirmRename(c.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      className="flex-1 min-w-0 bg-white dark:bg-neutral-800 border border-blue-400 rounded px-1.5 py-0.5 text-xs focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        confirmRename(c.id);
                      }}
                      className="p-0.5 hover:text-green-600"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingId(null);
                      }}
                      className="p-0.5 hover:text-red-500"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  <>
                    <span className="truncate flex-1">
                      {c.title || "New Chat"}
                    </span>

                    {/* 3-dot menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === c.id ? null : c.id);
                        }}
                        className={cn(
                          "p-0.5 rounded transition-all",
                          menuOpenId === c.id
                            ? "opacity-100"
                            : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        <MoreHorizontal size={14} />
                      </button>

                      {menuOpenId === c.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMenuOpenId(null);
                            }}
                          />
                          <div className="absolute right-0 top-6 z-50 w-36 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg py-1 text-xs">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(c);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                            >
                              <Pencil size={12} /> Rename
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenId(null);
                                onDelete(c.id);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                            >
                              <Trash2 size={12} /> Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN CHAT VIEW (Gemini-inspired)
   ════════════════════════════════════════════════════════════ */
export default function ChatView() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  /** Skip the load-messages effect when we just created a conversation inline */
  const skipLoadRef = useRef(false);

  /* conversation state */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  /* user display helpers */
  const userInitials = (() => {
    const name = profile?.full_name;
    if (name) {
      const parts = name.split(" ");
      return parts.length >= 2
        ? (parts[0][0] + parts[1][0]).toUpperCase()
        : name.substring(0, 2).toUpperCase();
    }
    return (user?.email ?? "U").substring(0, 2).toUpperCase();
  })();

  const firstName =
    profile?.full_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "there";

  /* ── Load conversations on mount ── */
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoadingHistory(true);
      const convs = await listConversations();
      setConversations(convs);
      setLoadingHistory(false);
    })();
  }, [user]);

  /* ── Load messages when conversation changes ── */
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    // Skip loading from DB when we just created the conversation inside send()
    if (skipLoadRef.current) {
      skipLoadRef.current = false;
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingMessages(true);
      const msgs = await loadMessages(activeConvId);
      if (!cancelled) {
        setMessages(msgs);
        setLoadingMessages(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeConvId]);

  /* auto-scroll */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* auto-resize textarea */
  useEffect(() => {
    if (!inputRef.current) return;
    inputRef.current.style.height = "auto";
    inputRef.current.style.height =
      Math.min(inputRef.current.scrollHeight, 200) + "px";
  }, [input]);

  /* ── Helpers ── */
  const refreshConversations = useCallback(async () => {
    const convs = await listConversations();
    setConversations(convs);
  }, []);

  const handleNewChat = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
    setActiveConvId(null);
    setMessages([]);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSelectConversation = useCallback(
    (id: string) => {
      if (id === activeConvId) return;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
        setIsLoading(false);
      }
      setActiveConvId(id);
    },
    [activeConvId]
  );

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      if (activeConvId === id) {
        setActiveConvId(null);
        setMessages([]);
      }
      await refreshConversations();
      toast.success("Chat deleted");
    },
    [activeConvId, refreshConversations]
  );

  const handleRenameConversation = useCallback(
    async (id: string, title: string) => {
      await updateConversationTitle(id, title);
      await refreshConversations();
    },
    [refreshConversations]
  );

  /* ── Stop generation ── */
  const stopGeneration = useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsLoading(false);
  }, []);

  /* ── Send message ── */
  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let convId = activeConvId;
    if (!convId) {
      const conv = await createConversation(deriveTitle(text.trim()));
      if (!conv) {
        toast.error("Failed to create conversation.");
        setIsLoading(false);
        return;
      }
      convId = conv.id;
      // Prevent the useEffect from overwriting our in-flight messages
      skipLoadRef.current = true;
      setActiveConvId(convId);
      await refreshConversations();
    }

    await saveMessage(convId, userMsg);

    const currentConv = conversations.find((c) => c.id === convId);
    if (!currentConv || currentConv.title === "New Chat") {
      await updateConversationTitle(convId!, deriveTitle(text.trim()));
      await refreshConversations();
    }

    let assistantSoFar = "";
    let currentSources: SourceDoc[] = [];

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      if (assistantSoFar.length <= 20 || assistantSoFar.length % 200 === 0) {
        console.log(`[ChatView] onDelta: assistantSoFar length=${assistantSoFar.length}`);
      }
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, content: assistantSoFar, sources: currentSources }
              : m
          );
        }
        return [
          ...prev,
          { role: "assistant" as const, content: assistantSoFar, sources: currentSources },
        ];
      });
    };

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat({
        messages: [...messages, userMsg],
        signal: controller.signal,
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => {
          console.log(`[ChatView] onDone fired. assistantSoFar length=${assistantSoFar.length}`);
          abortRef.current = null;
          setIsLoading(false);
        },
        onError: (err) => {
          console.error(`[ChatView] onError: ${err}`);
          abortRef.current = null;
          toast.error(err);
          setIsLoading(false);
        },
        onMetadata: (metadata: ChatMetadata) => {
          currentSources = metadata.sources;
        },
      });
    } catch (e: any) {
      if (e?.name !== "AbortError") {
        toast.error("Something went wrong. Please try again.");
      }
      setIsLoading(false);
      abortRef.current = null;
    }

    // Always persist the assistant response (normal, aborted, or errored)
    if (convId && assistantSoFar) {
      console.log(`[ChatView] Saving assistant response (${assistantSoFar.length} chars) to conv ${convId.slice(0, 8)}…`);
      const saved = await saveMessage(convId, {
        role: "assistant",
        content: assistantSoFar,
        sources: currentSources,
      });
      if (!saved) {
        toast.error("Failed to save assistant response");
      }
    } else {
      console.warn(`[ChatView] No assistant response to save (convId=${convId}, length=${assistantSoFar.length})`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const isEmpty = messages.length === 0 && !loadingMessages;

  /* ════════════ RENDER ════════════ */
  return (
    <div className="flex h-full w-full bg-white dark:bg-neutral-900">
      {/* ───── Sidebar ───── */}
      <ChatHistorySidebar
        conversations={conversations}
        activeId={activeConvId}
        onSelect={handleSelectConversation}
        onNew={handleNewChat}
        onDelete={handleDeleteConversation}
        onRename={handleRenameConversation}
      />

      {/* ───── Main area ───── */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-neutral-100 dark:border-neutral-800/60">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600">
              <GraduationCap size={15} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
              CSIS SmartAssist
            </span>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent" />
            </div>
          ) : isEmpty ? (
            /* ════ Empty state (Gemini style) ════ */
            <div className="flex flex-col items-center justify-center h-full px-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-violet-500 flex items-center justify-center">
                  <Sparkles size={20} className="text-white" />
                </div>
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold bg-gradient-to-r from-blue-600 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent mb-1">
                Hello, {firstName}
              </h1>
              <p className="text-neutral-500 dark:text-neutral-400 text-base mb-10">
                How can I help you today?
              </p>

              {/* Suggestion cards (2×2 grid) */}
              <div className="grid grid-cols-2 gap-3 max-w-lg w-full">
                {SUGGESTIONS.map((s) => {
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.label}
                      onClick={() => send(s.prompt)}
                      className="group flex flex-col items-start gap-2 rounded-2xl border border-neutral-200 dark:border-neutral-700/60 bg-neutral-50/60 dark:bg-neutral-800/40 p-4 text-left transition-all hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-sm"
                    >
                      <Icon
                        size={18}
                        className="text-blue-500 group-hover:text-blue-600 transition-colors"
                      />
                      <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                        {s.label}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 leading-snug">
                        {s.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ════ Message list ════ */
            <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx} className="animate-slide-up">
                  {msg.role === "user" ? (
                    <div className="flex gap-3 justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-tr-md bg-blue-600 text-white px-4 py-3">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.content}
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-blue-500 flex items-center justify-center shrink-0 mt-1">
                        <span className="text-[10px] font-bold text-white">
                          {userInitials}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0 mt-1">
                        <Sparkles size={14} className="text-white" />
                      </div>
                      <div className="max-w-[85%] flex-1 min-w-0">
                        <div className="prose prose-sm dark:prose-invert max-w-none text-neutral-800 dark:text-neutral-200 [&_p]:leading-relaxed [&_p]:my-1 [&_li]:my-0.5 [&_pre]:bg-neutral-100 [&_pre]:dark:bg-neutral-800 [&_pre]:rounded-xl [&_code]:text-[13px] [&_pre]:p-4">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                        {msg.sources && msg.sources.length > 0 && (
                          <SourcesSection sources={msg.sources} />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-3 animate-slide-up">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center shrink-0">
                    <Sparkles size={14} className="text-white animate-pulse" />
                  </div>
                  <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                    <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ───── Input area ───── */}
        <div className="px-4 md:px-6 pb-5 pt-2">
          <div className="max-w-3xl mx-auto">
            {/* Stop button */}
            {isLoading && (
              <div className="flex justify-center mb-3">
                <button
                  onClick={stopGeneration}
                  className="inline-flex items-center gap-2 rounded-full border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors shadow-sm"
                >
                  <Square size={14} className="fill-current" />
                  Stop generating
                </button>
              </div>
            )}

            {/* Input box */}
            <div className="relative flex items-end rounded-3xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/60 shadow-sm focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:shadow-md transition-all">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask CSIS SmartAssist anything..."
                rows={1}
                className="flex-1 bg-transparent resize-none px-5 py-3.5 text-sm text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none max-h-[200px] leading-relaxed"
              />
              <div className="pr-3 pb-2.5 flex items-end">
                <Button
                  onClick={() => send(input)}
                  disabled={!input.trim() || isLoading}
                  size="icon"
                  className={cn(
                    "h-9 w-9 rounded-full transition-all",
                    input.trim() && !isLoading
                      ? "bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                      : "bg-neutral-200 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed"
                  )}
                >
                  <Send size={16} />
                </Button>
              </div>
            </div>

            <p className="text-center text-[11px] text-neutral-400 mt-2">
              SmartAssist may display inaccurate info. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

