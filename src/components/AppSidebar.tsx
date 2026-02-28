import { MessageSquare, CalendarPlus, ClipboardList, BookOpen, Settings, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type View = "chat" | "booking" | "my-requests" | "knowledge" | "settings";

interface Conversation {
  id: string;
  title: string;
}

interface AppSidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
}

const navItems: { id: View; label: string; icon: React.ElementType }[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "booking", label: "New Booking", icon: CalendarPlus },
  { id: "my-requests", label: "My Requests", icon: ClipboardList },
  { id: "knowledge", label: "Knowledge Base", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AppSidebar({
  currentView,
  onViewChange,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
}: AppSidebarProps) {
  return (
    <aside className="w-64 h-screen flex flex-col bg-sidebar border-r border-sidebar-border" style={{ background: 'var(--gradient-sidebar)' }}>
      {/* Logo */}
      <div className="p-5 border-b border-sidebar-border">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-display font-bold text-sm">CS</span>
          </div>
          <div>
            <h1 className="font-display font-bold text-sidebar-foreground text-base leading-tight">SmartAssist</h1>
            <p className="text-[11px] text-sidebar-muted leading-tight">CSIS Department</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
              )}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Chat History */}
      {currentView === "chat" && (
        <div className="flex-1 flex flex-col overflow-hidden border-t border-sidebar-border mt-2">
          <div className="px-3 pt-4 pb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-sidebar-muted uppercase tracking-wider">Recent Chats</span>
            <button
              onClick={onNewChat}
              className="p-1.5 rounded-md text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              title="New Chat"
            >
              <Plus size={14} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-3 space-y-0.5">
            {conversations.map((c) => (
              <div
                key={c.id}
                className={cn(
                  "group flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-all duration-150",
                  c.id === activeConversationId
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
                onClick={() => onSelectConversation(c.id)}
              >
                <MessageSquare size={14} className="shrink-0" />
                <span className="truncate flex-1">{c.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-sidebar-border transition-all"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center">
            <span className="text-xs font-medium text-sidebar-accent-foreground">G</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">Guest User</p>
            <p className="text-xs text-sidebar-muted truncate">CSIS Department</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
