import { 
  Home, 
  MessageSquare, 
  CalendarPlus, 
  ClipboardList, 
  CheckCircle, 
  Bot, 
  Bell, 
  Settings,
  GraduationCap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/contexts/AuthContext";

export type View = "home" | "chat" | "booking" | "my-requests" | "approvals" | "assistant" | "notifications" | "settings";

interface AppSidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  userRole?: UserRole;
}

const navItems: { id: View; label: string; icon: React.ElementType; adminOnly?: boolean }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "booking", label: "New Booking", icon: CalendarPlus },
  { id: "my-requests", label: "My Requests", icon: ClipboardList },
  { id: "approvals", label: "Approvals", icon: CheckCircle, adminOnly: true },
  { id: "assistant", label: "Assistant", icon: Bot },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function AppSidebar({
  currentView,
  onViewChange,
  userRole,
}: AppSidebarProps) {
  const isAdmin = userRole === "admin" || userRole === "professor";

  return (
    <aside className="w-64 h-screen flex flex-col bg-[#0f1419] border-r border-white/10">
      {/* Logo */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-white text-base leading-tight">CSIS</h1>
            <p className="text-xs text-gray-400 leading-tight">SmartAssist</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onViewChange(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                )}
              >
                <Icon size={20} className={isActive ? "text-primary" : ""} />
                <span>{item.label}</span>
              </button>
            );
          })}
      </nav>
    </aside>
  );
}
