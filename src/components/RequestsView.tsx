import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Clock, CheckCircle2, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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
  pending: { icon: Clock, label: "Pending", className: "bg-warning/10 text-warning" },
  approved: { icon: CheckCircle2, label: "Approved", className: "bg-success/10 text-success" },
  rejected: { icon: XCircle, label: "Rejected", className: "bg-destructive/10 text-destructive" },
  cancelled: { icon: AlertCircle, label: "Cancelled", className: "bg-muted text-muted-foreground" },
};

export default function RequestsView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setBookings(data);
    setLoading(false);
  };

  useEffect(() => { fetchBookings(); }, []);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 h-full overflow-y-auto scrollbar-thin">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">My Requests</h1>
          <p className="text-muted-foreground">Track the status of your booking requests.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchBookings}>
          <RefreshCw size={14} className="mr-2" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="animate-spin text-muted-foreground" size={24} />
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-muted-foreground">No booking requests yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => {
            const status = statusConfig[b.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <div
                key={b.id}
                className="bg-card rounded-xl border border-border p-5 hover:border-primary/20 transition-colors animate-slide-up"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-display font-semibold text-foreground">{b.venue}</h3>
                      <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium", status.className)}>
                        <StatusIcon size={12} />
                        {status.label}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
                      <span>{format(new Date(b.date), "EEE, MMM d, yyyy")}</span>
                      <span>{b.start_time.slice(0, 5)} – {b.end_time.slice(0, 5)}</span>
                      <span>By: {b.requested_by}</span>
                    </div>
                    {b.purpose && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{b.purpose}</p>
                    )}
                    {b.admin_remarks && (
                      <p className="text-sm text-primary mt-2 italic">Admin: {b.admin_remarks}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(new Date(b.created_at), "MMM d, h:mm a")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
