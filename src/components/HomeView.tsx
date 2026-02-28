import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, CalendarPlus, ClipboardList, CheckCircle, TrendingUp, Clock, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  route: string;
}

const quickActions: QuickAction[] = [
  {
    id: "chat",
    label: "Chat with Assistant",
    description: "Get help with campus queries",
    icon: MessageSquare,
    color: "from-emerald-500 to-emerald-600",
    route: "/dashboard/chat",
  },
  {
    id: "booking",
    label: "New Booking",
    description: "Book a lab or room",
    icon: CalendarPlus,
    color: "from-blue-500 to-blue-600",
    route: "/dashboard/booking",
  },
  {
    id: "requests",
    label: "My Requests",
    description: "Track your bookings",
    icon: ClipboardList,
    color: "from-violet-500 to-violet-600",
    route: "/dashboard/requests",
  },
  {
    id: "assistant",
    label: "Booking Assistant",
    description: "Quick availability check",
    icon: CheckCircle,
    color: "from-amber-500 to-amber-600",
    route: "/dashboard/assistant",
  },
];

export default function HomeView() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    totalBookings: 0,
    pendingBookings: 0,
    approvedBookings: 0,
  });

  useEffect(() => {
    if (!user) return;

    supabase
      .from("bookings")
      .select("status")
      .or(`email.eq.${user.email},requested_by.eq.${profile?.full_name}`)
      .then(({ data }) => {
        if (data) {
          setStats({
            totalBookings: data.length,
            pendingBookings: data.filter((b) => b.status === "pending").length,
            approvedBookings: data.filter((b) => b.status === "approved").length,
          });
        }
      });
  }, [user, profile]);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {greeting()}, {profile?.full_name?.split(" ")[0] || "there"}! 👋
          </h1>
          <p className="text-muted-foreground">
            Welcome to CSIS SmartAssist. What would you like to do today?
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Bookings</span>
              <TrendingUp size={16} className="text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-foreground">{stats.totalBookings}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Pending</span>
              <Clock size={16} className="text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-amber-500">{stats.pendingBookings}</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-muted-foreground uppercase tracking-wider">Approved</span>
              <CheckCircle size={16} className="text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-emerald-500">{stats.approvedBookings}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={() => navigate(action.route)}
                  className="bg-card rounded-xl border border-border p-5 text-left hover:border-primary/30 hover:shadow-md transition-all group"
                >
                  <div className={cn(
                    "w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center mb-4 group-hover:scale-110 transition-transform",
                    action.color
                  )}>
                    <Icon size={24} className="text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{action.label}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recent Activity Placeholder */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h2>
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">Start using SmartAssist</p>
            <p className="text-muted-foreground text-sm">Your recent activity will appear here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
