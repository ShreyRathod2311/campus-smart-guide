import { useState } from "react";
import { Bell, Calendar, CheckCircle, Clock, AlertCircle, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "approval" | "reminder" | "info";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const mockNotifications: Notification[] = [
  {
    id: "1",
    type: "approval",
    title: "Booking Approved",
    message: "Your booking for Lab 3 - Software Dev on Feb 24 has been approved.",
    time: "5 minutes ago",
    read: false,
  },
  {
    id: "2",
    type: "reminder",
    title: "TA Reminder",
    message: "TA application deadline is approaching. Submit by March 1, 2026.",
    time: "23 minutes ago",
    read: false,
  },
  {
    id: "3",
    type: "reminder",
    title: "Exam Reminder",
    message: "Mid-semester exams start on March 10, 2026.",
    time: "28 minutes ago",
    read: false,
  },
  {
    id: "4",
    type: "info",
    title: "Lab Maintenance",
    message: "AI & ML Lab will be under maintenance on March 5, 2026.",
    time: "1 hour ago",
    read: true,
  },
  {
    id: "5",
    type: "approval",
    title: "Booking Rejected",
    message: "Your booking for Conference Room 1 on Feb 15 was rejected due to scheduling conflict.",
    time: "2 days ago",
    read: true,
  },
];

const typeConfig = {
  approval: { icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/20" },
  reminder: { icon: Clock, color: "text-amber-400", bg: "bg-amber-500/20" },
  info: { icon: AlertCircle, color: "text-blue-400", bg: "bg-blue-500/20" },
};

export default function NotificationsView() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notifications` : "All caught up!"}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={markAllRead}
            >
              <Check size={14} className="mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-border">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-medium">No notifications</p>
            <p className="text-muted-foreground text-sm">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => {
              const config = typeConfig[notification.type];
              const Icon = config.icon;
              return (
                <div
                  key={notification.id}
                  className={cn(
                    "bg-card rounded-xl border border-border p-4 transition-all hover:border-primary/30",
                    !notification.read && "border-l-4 border-l-primary"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", config.bg)}>
                      <Icon size={18} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className={cn(
                          "font-medium",
                          notification.read ? "text-muted-foreground" : "text-foreground"
                        )}>
                          {notification.title}
                        </h3>
                        <button
                          onClick={() => deleteNotification(notification.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-2">{notification.time}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
