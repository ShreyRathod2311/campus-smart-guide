import { useState, useRef, useEffect } from "react";
import { Send, Sparkles, Clock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  alternatives?: { start: string; end: string }[];
  venue?: string;
  showActions?: boolean;
}

export default function AssistantView() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text.trim(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response about booking availability
    setTimeout(() => {
      const lowerText = text.toLowerCase();
      let response: Message;

      if (lowerText.includes("available") || lowerText.includes("free") || lowerText.includes("book")) {
        // Extract venue from message
        let venue = "Networks Lab";
        if (lowerText.includes("lab 1") || lowerText.includes("ai lab")) venue = "AI & ML Lab";
        if (lowerText.includes("lab 2") || lowerText.includes("network")) venue = "Networks Lab";
        if (lowerText.includes("lab 3") || lowerText.includes("software")) venue = "Software Dev Lab";
        if (lowerText.includes("seminar")) venue = "Seminar Hall";
        if (lowerText.includes("conference") || lowerText.includes("conf")) venue = "Conference Room 1";

        response = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `The **${venue}** is booked from 2 PM to 4 PM tomorrow.\n\nAlternative slots available:`,
          venue: venue,
          alternatives: [
            { start: "12:00 PM", end: "2:00 PM" },
            { start: "4:00 PM", end: "6:00 PM" },
          ],
          showActions: true,
        };
      } else {
        response = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "I can help you check availability and book labs or rooms. Just ask me something like:\n\n• \"Is the Networks Lab available tomorrow at 3 PM?\"\n• \"Book Lab 3 for Friday 2 PM\"\n• \"Show available slots for Seminar Hall\"",
        };
      }

      setMessages((prev) => [...prev, response]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend(input);
    }
  };

  const handleConfirmBooking = (venue: string, slot: { start: string; end: string }) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: "assistant",
        content: `✅ Great! I've submitted a booking request for **${venue}** from ${slot.start} to ${slot.end}. You'll receive a notification once it's approved.`,
      },
    ]);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Booking Assistant</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full animate-fade-in">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
              <Sparkles className="text-primary" size={28} />
            </div>
            <h2 className="font-semibold text-xl text-foreground mb-2">
              How can I help with your booking?
            </h2>
            <p className="text-muted-foreground text-center max-w-md">
              Ask me about lab availability, room bookings, or let me help you find the perfect time slot.
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex gap-3 animate-slide-up",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
                    <Sparkles size={16} className="text-primary" />
                  </div>
                )}
                <div className="max-w-[80%]">
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-3",
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-card border border-border text-foreground rounded-bl-md"
                    )}
                  >
                    <p className="text-sm whitespace-pre-line">
                      {msg.content.split("**").map((part, i) => 
                        i % 2 === 1 ? <span key={i} className="text-primary font-medium">{part}</span> : part
                      )}
                    </p>
                    
                    {/* Alternative Slots */}
                    {msg.alternatives && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {msg.alternatives.map((slot, idx) => (
                          <button
                            key={idx}
                            onClick={() => msg.venue && handleConfirmBooking(msg.venue, slot)}
                            className="px-3 py-1.5 rounded-lg bg-primary/20 border border-primary/30 text-primary text-sm hover:bg-primary/30 transition-colors"
                          >
                            {slot.start} - {slot.end}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    {msg.showActions && (
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          variant="outline"
                          className="bg-transparent border-white/20 text-white hover:bg-white/10"
                          onClick={() => msg.venue && msg.alternatives && handleConfirmBooking(msg.venue, msg.alternatives[0])}
                        >
                          <Check size={14} className="mr-1" />
                          Confirm
                        </Button>
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                        >
                          Suggest Another Time
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {msg.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shrink-0 mt-1 text-primary-foreground font-semibold text-xs">
                    VA
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start animate-slide-up">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Sparkles size={16} className="text-primary animate-pulse" />
                </div>
                <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 pb-6">
        <div className="max-w-3xl mx-auto relative">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about availability or make a booking..."
            className="w-full px-4 py-3 pr-24 rounded-2xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all text-sm"
          />
          <Button
            onClick={() => handleSend(input)}
            disabled={!input.trim() || isLoading}
            size="sm"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-4"
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}
