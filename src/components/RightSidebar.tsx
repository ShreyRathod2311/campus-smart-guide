import { Bell, Calendar, Clock, Edit, User, Trash2, MoreHorizontal, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RightSidebarProps {
  userInitials: string;
  userName?: string | null;
  onSignOut?: () => void;
  onNavigateToApprovals?: () => void;
}

const upcomingItems = [
  { id: 1, title: "TA Reminder", time: "23 minutes ago", icon: Calendar, color: "bg-emerald-500" },
  { id: 2, title: "Exam Reminder", time: "28 minutes ago", icon: Clock, color: "bg-amber-500" },
];

export default function RightSidebar({ userInitials, userName, onSignOut, onNavigateToApprovals }: RightSidebarProps) {
  return (
    <aside className="w-72 h-screen flex-col bg-card/50 border-l border-border p-4 hidden xl:flex">
      {/* User Profile & Notifications */}
      <div className="flex items-center justify-end gap-3 mb-6">
        <button className="relative p-2 rounded-lg hover:bg-secondary/50 transition-colors">
          <Bell size={20} className="text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 p-1 rounded-lg hover:bg-secondary/50 transition-colors">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-semibold text-sm">
                {userInitials}
              </div>
              <ChevronDown size={14} className="text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onSignOut} className="text-destructive">
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Approvals Quick Access */}
      <div className="bg-card rounded-xl border border-border p-4 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-sm">Approvals</h3>
          <button className="text-muted-foreground hover:text-foreground">
            <MoreHorizontal size={16} />
          </button>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={onNavigateToApprovals}
            className="flex-1 aspect-square rounded-xl bg-emerald-500 hover:bg-emerald-600 transition-colors flex items-center justify-center group"
          >
            <Edit size={24} className="text-white" />
          </button>
          <button 
            onClick={onNavigateToApprovals}
            className="flex-1 aspect-square rounded-xl bg-violet-500 hover:bg-violet-600 transition-colors flex items-center justify-center"
          >
            <User size={24} className="text-white" />
          </button>
          <button 
            onClick={onNavigateToApprovals}
            className="flex-1 aspect-square rounded-xl bg-rose-500 hover:bg-rose-600 transition-colors flex items-center justify-center"
          >
            <Trash2 size={24} className="text-white" />
          </button>
        </div>
      </div>

      {/* Up Next */}
      <div className="bg-card rounded-xl border border-border p-4 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-sm">Up Next</h3>
          <button className="text-muted-foreground hover:text-foreground">
            <MoreHorizontal size={16} />
          </button>
        </div>
        <div className="space-y-3">
          {upcomingItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors cursor-pointer">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", item.color)}>
                  <Icon size={18} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
