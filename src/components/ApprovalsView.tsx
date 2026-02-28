import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Calendar, Clock, User, Check, X, RefreshCw, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Booking {
  id: string;
  venue: string;
  date: string;
  start_time: string;
  end_time: string;
  purpose: string | null;
  requested_by: string;
  email: string | null;
  status: string;
  created_at: string;
}

export default function ApprovalsView() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [processing, setProcessing] = useState(false);

  const fetchPendingBookings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("bookings")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });
    
    if (data) {
      setBookings(data);
      if (data.length > 0 && !selectedBooking) {
        setSelectedBooking(data[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchPendingBookings(); }, []);

  const handleApprove = async () => {
    if (!selectedBooking) return;
    setProcessing(true);
    
    const { error } = await supabase
      .from("bookings")
      .update({ status: "approved" })
      .eq("id", selectedBooking.id);

    if (error) {
      toast.error("Failed to approve booking");
    } else {
      toast.success("Booking approved!");
      setSelectedBooking(null);
      fetchPendingBookings();
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedBooking) return;
    setProcessing(true);
    
    const { error } = await supabase
      .from("bookings")
      .update({ status: "rejected" })
      .eq("id", selectedBooking.id);

    if (error) {
      toast.error("Failed to reject booking");
    } else {
      toast.success("Booking rejected");
      setSelectedBooking(null);
      fetchPendingBookings();
    }
    setProcessing(false);
  };

  const formatTime = (time: string) => {
    const hour = parseInt(time.slice(0, 2));
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:00 ${ampm}`;
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <h1 className="text-2xl font-bold text-foreground mb-6">Admin Booking Approvals</h1>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-border">
            <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <p className="text-foreground font-medium">All caught up!</p>
            <p className="text-muted-foreground text-sm">No pending booking requests.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left - Pending Requests List */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Pending Requests</p>
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => setSelectedBooking(booking)}
                    className={cn(
                      "w-full text-left bg-card rounded-xl border p-4 transition-all",
                      selectedBooking?.id === booking.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        selectedBooking?.id === booking.id ? "bg-primary/20" : "bg-amber-500/20"
                      )}>
                        <Building size={18} className={cn(
                          selectedBooking?.id === booking.id ? "text-primary" : "text-amber-400"
                        )} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">{booking.venue}</h3>
                        <p className="text-sm text-muted-foreground truncate">{booking.requested_by}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {format(new Date(booking.date), "MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right - Booking Details */}
            {selectedBooking && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="font-semibold text-foreground text-lg mb-6">Booking Request Details</h2>

                <div className="space-y-5">
                  {/* User */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">User</p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white text-xs font-semibold">
                        {selectedBooking.requested_by.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <span className="text-foreground">{selectedBooking.requested_by}</span>
                    </div>
                  </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Date</p>
                      <p className="text-foreground">{format(new Date(selectedBooking.date), "d MMMM, yyyy")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Time</p>
                      <div className="inline-block px-3 py-2 rounded-lg bg-primary/20 text-primary">
                        {formatTime(selectedBooking.start_time)} - {formatTime(selectedBooking.end_time)}
                      </div>
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Purpose</p>
                    <div className="px-4 py-3 rounded-lg bg-muted text-foreground">
                      {selectedBooking.purpose || "No purpose specified"}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleApprove}
                      disabled={processing}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      <Check size={16} className="mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={processing}
                      variant="destructive"
                      className="flex-1"
                    >
                      <X size={16} className="mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
