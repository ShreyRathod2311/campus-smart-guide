import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CelestialSphere } from "@/components/ui/celestial-sphere";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  ArrowUpIcon,
  Paperclip,
  BookOpen,
  HelpCircle,
  CalendarPlus,
  Sparkles,
  MessageSquare,
  Shield,
  ChevronRight,
} from "lucide-react";

/* ─── Auto-resize hook ─── */
function useAutoResizeTextarea({ minHeight, maxHeight }: { minHeight: number; maxHeight?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustHeight = useCallback(
    (reset?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      if (reset) { textarea.style.height = `${minHeight}px`; return; }
      textarea.style.height = `${minHeight}px`;
      const newHeight = Math.max(minHeight, Math.min(textarea.scrollHeight, maxHeight ?? Infinity));
      textarea.style.height = `${newHeight}px`;
    },
    [minHeight, maxHeight],
  );
  useEffect(() => {
    if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`;
  }, [minHeight]);
  return { textareaRef, adjustHeight };
}

/* ─── Quick-action pill ─── */
function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <Button
      variant="outline"
      onClick={onClick}
      className="flex items-center gap-2 rounded-full border-neutral-700 bg-black/50 text-neutral-300 hover:text-white hover:bg-neutral-700"
    >
      {icon}
      <span className="text-xs">{label}</span>
    </Button>
  );
}

/* ─── Landing Page ─── */
export default function Landing() {
  const [message, setMessage] = useState("");
  const navigate = useNavigate();
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 48, maxHeight: 150 });

  const handleSubmit = () => {
    navigate("/sign-in");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative w-full min-h-screen bg-black flex flex-col">
      {/* ─── Hero with CelestialSphere ─── */}
      <section className="relative flex h-screen w-full flex-col items-center overflow-hidden">
        <CelestialSphere
          hue={210.0}
          speed={0.4}
          zoom={1.2}
          particleSize={4.0}
          className="absolute top-0 left-0 w-full h-full"
        />

        {/* Header */}
        <header className="relative z-20 w-full">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">SmartAssist</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" asChild className="text-white/70 hover:text-white hover:bg-white/10">
                <Link to="/sign-in">Sign In</Link>
              </Button>
              <Button asChild className="bg-white text-black hover:bg-white/90">
                <Link to="/sign-up">
                  Get Started
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Centered title + chat input (RuixenMoonChat style) */}
        <div className="relative z-10 flex-1 w-full flex flex-col items-center justify-center pointer-events-none">
          <div className="text-center mb-8 pointer-events-auto">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white tracking-tighter drop-shadow-sm">
              CSIS SmartAssist
            </h1>
            <p className="mt-3 text-lg text-neutral-300">
              Navigate academic policies, book labs, track requests — just start typing below.
            </p>
          </div>

          {/* Chat Input */}
          <div className="w-full max-w-3xl px-4 pointer-events-auto">
            <div className="relative bg-black/60 backdrop-blur-md rounded-xl border border-neutral-700">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about CSIS campus..."
                className={cn(
                  "w-full px-4 py-3 resize-none border-none",
                  "bg-transparent text-white text-sm",
                  "focus-visible:ring-0 focus-visible:ring-offset-0",
                  "placeholder:text-neutral-400 min-h-[48px]"
                )}
                style={{ overflow: "hidden" }}
              />

              <div className="flex items-center justify-between p-3">
                <Button variant="ghost" size="icon" className="text-white hover:bg-neutral-700">
                  <Paperclip className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleSubmit}
                  className={cn(
                    "flex items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                    message.trim()
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
                  )}
                >
                  <ArrowUpIcon className="w-4 h-4" />
                  <span className="sr-only">Send</span>
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-center flex-wrap gap-3 mt-6 mb-8">
              <QuickAction icon={<MessageSquare className="w-4 h-4" />} label="Ask a Question" onClick={handleSubmit} />
              <QuickAction icon={<CalendarPlus className="w-4 h-4" />} label="Book a Lab" onClick={handleSubmit} />
              <QuickAction icon={<BookOpen className="w-4 h-4" />} label="TA Application" onClick={handleSubmit} />
              <QuickAction icon={<HelpCircle className="w-4 h-4" />} label="Reimbursement" onClick={handleSubmit} />
              <QuickAction icon={<Sparkles className="w-4 h-4" />} label="Academic Policies" onClick={handleSubmit} />
              <QuickAction icon={<Shield className="w-4 h-4" />} label="Campus Info" onClick={handleSubmit} />
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-20 border-t border-white/10 py-6 bg-black">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-white">CSIS SmartAssist</span>
          </div>
          <p className="text-sm text-gray-600">
            © 2026 BITS Pilani Goa Campus. Built for CSIS Department.
          </p>
        </div>
      </footer>
    </div>
  );
}
