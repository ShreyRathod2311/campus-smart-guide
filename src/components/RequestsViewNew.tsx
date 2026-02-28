import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Clock, CheckCircle, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Booking {
  id: string;
  venue: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string | null;
  requested_by: string;
  status: string;
  admin_remarks: string | null;
  created_at: string;
}

const statusConfig: Record<string, { icon: React.ElementType; label: string; className: string }> = {
  pending: { icon: AlertCircle, label: "Pending", className: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  approved: { icon: CheckCircle, label: "Approved", className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  rejected: { icon: XCircle, label: "Rejected", className: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  cancelled: { icon: AlertCircle, label: "Cancelled", className: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

export default function RequestsViewNew() {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, rejected: 0 });

  const fetchBookings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .or(`email.eq.${user?.email},requested_by.eq.${profile?.full_name}`)
      .order("created_at", { ascending: false });
    
    if (data) {
      setBookings(data);
      setStats({
        total: data.length,
        approved: data.filter(b => b.status === "approved").length,
        pending: data.filter(b => b.status === "pending").length,
        rejected: data.filter(b => b.status === "rejected").length,
      });
    }
    setLoading(false);
  };

  useEffect(() => { 
    if (user) fetchBookings(); 
  }, [user, profile]);

  const getBookingId = (booking: Booking) => {
    return `BK${booking.created_at.slice(2, 4)}${String(bookings.indexOf(booking) + 28).padStart(2, '0')}`;
  };

  const getDuration = (start: string, end: string) => {
    const startHour = parseInt(start.slice(0, 2));
    const endHour = parseInt(end.slice(0, 2));
    const hours = endHour - startHour;
    return hours === 1 ? "1 hr" : `${hours} hrs`;
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-1">Track all your room and lab reservation requests</p>
          <h1 className="text-2xl font-bold text-foreground">My Reservations</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Total Requests</p>
            <p className="text-4xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Approved</p>
            <p className="text-4xl font-bold text-emerald-500">{stats.approved}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Pending</p>
            <p className="text-4xl font-bold text-amber-500">{stats.pending}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Rejected</p>
            <p className="text-4xl font-bold text-rose-500">{stats.rejected}</p>
          </div>
        </div>

        <hr className="border-border mb-6" />

        {/* Bookings List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="animate-spin text-gray-400" size={24} />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400">No booking requests yet.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => {
              const status = statusConfig[booking.status] || statusConfig.pending;
              const StatusIcon = status.icon;
              return (
                <div
                  key={booking.id}
                  className={cn(
                    "bg-card rounded-xl border border-border p-5 transition-colors hover:border-primary/30",
                    booking.status === "pending" && "border-l-4 border-l-amber-500"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-lg mb-2">{booking.venue}</h3>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} className="text-primary" />
                          {format(new Date(booking.date), "MMM d, yyyy")}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock size={14} className="text-gray-500" />
                          {booking.start_time.slice(0, 5).replace(":", ":")} {parseInt(booking.start_time) < 12 ? "AM" : "PM"}
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="flex items-center gap-1">
                          <Clock size={14} className="text-gray-500" />
                          {getDuration(booking.start_time, booking.end_time)}
                        </span>
                        <span className="text-gray-500 text-xs">{getBookingId(booking)}</span>
                      </div>
                    </div>
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
                      status.className
                    )}>
                      <StatusIcon size={12} />
                      {status.label}
                    </span>
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
