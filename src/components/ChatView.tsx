import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles, BookOpen, HelpCircle, CalendarPlus, FileText, ChevronDown, ChevronUp, ExternalLink, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Msg, SourceDoc, ChatMetadata, streamChat } from "@/lib/chat-stream";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ChatViewProps {
  messages: Msg[];
  setMessages: React.Dispatch<React.SetStateAction<Msg[]>>;
  onNavigateToBooking: () => void;
}

const QUICK_ACTIONS = [
  { label: "TA Application", icon: BookOpen, prompt: "How do I apply for a TA position in CSIS?" },
  { label: "Book a Lab", icon: CalendarPlus, prompt: "I want to book the AI & ML Lab for tomorrow at 2 PM" },
  { label: "Reimbursement", icon: HelpCircle, prompt: "What is the process for bill reimbursement?" },
  { label: "Academic Calendar", icon: Sparkles, prompt: "What are the important dates for this semester?" },
];

// Source card component
function SourceCard({ source, isExpanded, onToggle }: { source: SourceDoc; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden bg-muted/30">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <FileText size={14} className="text-primary shrink-0" />
          <span className="text-sm font-medium truncate">{source.title}</span>
          <span className="text-xs text-muted-foreground px-1.5 py-0.5 bg-muted rounded shrink-0">
            {source.category}
          </span>
          {source.similarity && (
            <span className="text-xs text-green-600 shrink-0">{source.similarity}% match</span>
          )}
        </div>
        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {isExpanded && source.source && (
        <div className="px-3 py-2 border-t border-border bg-muted/20">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Source:</span> {source.source}
          </p>
        </div>
      )}
    </div>
  );
}

// Sources section component
function SourcesSection({ sources }: { sources: SourceDoc[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 pt-3 border-t border-border/50">
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
      >
        <FileText size={12} />
        <span className="font-medium">Sources ({sources.length})</span>
        {isCollapsed ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
      </button>
      {!isCollapsed && (
        <div className="space-y-2 animate-fade-in">
          {sources.map((source) => (
            <SourceCard
              key={source.id}
              source={source}
              isExpanded={expandedId === source.id}
              onToggle={() => setExpandedId(expandedId === source.id ? null : source.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Generated image component
function GeneratedImage({ url }: { url: string }) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div className="mt-3 p-4 border border-border rounded-lg bg-muted/30 text-center">
        <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load generated image</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
        <ImageIcon size={12} />
        <span className="font-medium">Generated Image</span>
      </div>
      <div className="relative rounded-lg overflow-hidden border border-border">
        {isLoading && (
          <div className="absolute inset-0 bg-muted animate-pulse flex items-center justify-center">
            <span className="text-sm text-muted-foreground">Loading image...</span>
          </div>
        )}
        <img
          src={url}
          alt="AI Generated"
          className={cn("w-full max-w-md rounded-lg", isLoading && "opacity-0")}
          onLoad={() => setIsLoading(false)}
          onError={() => setHasError(true)}
        />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
      >
        Open full size <ExternalLink size={10} />
      </a>
    </div>
  );
}

export default function ChatView({ messages, setMessages, onNavigateToBooking }: ChatViewProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    let currentSources: SourceDoc[] = [];
    let currentImage: string | null = null;
    
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) =>
            i === prev.length - 1 ? { 
              ...m, 
              content: assistantSoFar,
              sources: currentSources,
              generatedImage: currentImage,
            } : m
          );
        }
        return [...prev, { 
          role: "assistant", 
          content: assistantSoFar,
          sources: currentSources,
          generatedImage: currentImage,
        }];
      });
    };

    try {
      await streamChat({
        messages: [...messages, userMsg],
        onDelta: (chunk) => upsertAssistant(chunk),
        onDone: () => setIsLoading(false),
        onError: (err) => {
          toast.error(err);
          setIsLoading(false);
        },
        onMetadata: (metadata) => {
          currentSources = metadata.sources;
          currentImage = metadata.generatedImage;
          // Update message with metadata even before content starts
          if (assistantSoFar === "") {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) =>
                  i === prev.length - 1 ? { 
                    ...m, 
                    sources: currentSources,
                    generatedImage: currentImage,
                  } : m
                );
              }
              return prev;
            });
          }
        },
      });
    } catch {
      toast.error("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full px-6 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
              <Bot className="text-primary" size={32} />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              Hello! How can I assist you today?
            </h2>
            <p className="text-muted-foreground text-center max-w-md mb-8">
              Ask me about academic policies, TA applications, lab bookings, reimbursements, or any CSIS department queries.
            </p>

            <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => send(action.prompt)}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:bg-secondary/50 hover:border-primary/20 transition-all duration-200 text-left group"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Icon size={18} className="text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{action.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-1">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 py-4 animate-slide-up ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-1">
                    <Bot size={16} className="text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-chat-user text-chat-user-foreground rounded-br-md"
                      : "bg-chat-assistant text-chat-assistant-foreground border border-border rounded-bl-md"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <>
                      <div className="prose prose-sm max-w-none prose-p:my-1.5 prose-headings:my-2 prose-li:my-0.5 prose-pre:bg-muted prose-pre:text-foreground prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                      {/* Generated Image */}
                      {msg.generatedImage && (
                        <GeneratedImage url={msg.generatedImage} />
                      )}
                      {/* Source Documents */}
                      {msg.sources && msg.sources.length > 0 && (
                        <SourcesSection sources={msg.sources} />
                      )}
                    </>
                  ) : (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
                    <User size={16} className="text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex gap-3 py-4 animate-fade-in">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot size={16} className="text-primary" />
                </div>
                <div className="bg-chat-assistant border border-border rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse-subtle" />
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse-subtle" style={{ animationDelay: "0.3s" }} />
                    <div className="w-2 h-2 rounded-full bg-primary/40 animate-pulse-subtle" style={{ animationDelay: "0.6s" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/80 backdrop-blur-sm p-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-3 bg-background border border-border rounded-2xl px-4 py-3 shadow-sm focus-within:border-primary/40 focus-within:shadow-glow transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask SmartAssist anything..."
              className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-foreground placeholder:text-muted-foreground max-h-32 min-h-[24px] font-body"
              rows={1}
              disabled={isLoading}
            />
            <Button
              size="sm"
              onClick={() => send(input)}
              disabled={!input.trim() || isLoading}
              className="rounded-xl h-9 w-9 p-0 shrink-0"
            >
              <Send size={16} />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            SmartAssist can make mistakes. Verify important information with the CSIS office.
          </p>
        </div>
      </div>
    </div>
  );
}
