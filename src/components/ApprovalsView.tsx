import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Clock,
  Check,
  X,
  RefreshCw,
  Building,
  CalendarPlus,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  approveBooking,
  rejectBooking,
  formatTimeDisplay,
} from "@/lib/booking-service";

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
  const [adminRemarks, setAdminRemarks] = useState("");
  const [lastCalendarUrl, setLastCalendarUrl] = useState<string | null>(null);

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

  useEffect(() => {
    fetchPendingBookings();
  }, []);

  const handleApprove = async () => {
    if (!selectedBooking) return;
    setProcessing(true);

    const result = await approveBooking(selectedBooking.id, adminRemarks || undefined);

    if (!result.success) {
      toast.error(result.error || "Failed to approve booking");
    } else {
      toast.success("Booking approved! Email sent to the user.");
      if (result.calendarUrl) {
        setLastCalendarUrl(result.calendarUrl);
      }
      setSelectedBooking(null);
      setAdminRemarks("");
      fetchPendingBookings();
    }
    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selectedBooking) return;
    setProcessing(true);

    const result = await rejectBooking(selectedBooking.id, adminRemarks || undefined);

    if (!result.success) {
      toast.error(result.error || "Failed to reject booking");
    } else {
      toast.success("Booking rejected. Email sent to the user.");
      setSelectedBooking(null);
      setAdminRemarks("");
      fetchPendingBookings();
    }
    setProcessing(false);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Admin Booking Approvals
        </h1>

        {/* Calendar link banner */}
        {lastCalendarUrl && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center gap-3 animate-fade-in">
            <Check className="text-emerald-500 shrink-0" size={18} />
            <span className="text-sm text-foreground flex-1">
              Booking approved successfully!
            </span>
            <a
              href={lastCalendarUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 text-sm font-medium transition-colors"
            >
              <CalendarPlus size={14} />
              Add to Google Calendar
              <ExternalLink size={12} />
            </a>
            <button
              onClick={() => setLastCalendarUrl(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <RefreshCw
              className="animate-spin text-muted-foreground"
              size={24}
            />
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 bg-card rounded-xl border border-border">
            <Check className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
            <p className="text-foreground font-medium">All caught up!</p>
            <p className="text-muted-foreground text-sm">
              No pending booking requests.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left - Pending Requests List */}
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">
                Pending Requests
              </p>
              <div className="space-y-3">
                {bookings.map((booking) => (
                  <button
                    key={booking.id}
                    onClick={() => {
                      setSelectedBooking(booking);
                      setAdminRemarks("");
                    }}
                    className={cn(
                      "w-full text-left bg-card rounded-xl border p-4 transition-all",
                      selectedBooking?.id === booking.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                          selectedBooking?.id === booking.id
                            ? "bg-primary/20"
                            : "bg-amber-500/20"
                        )}
                      >
                        <Building
                          size={18}
                          className={cn(
                            selectedBooking?.id === booking.id
                              ? "text-primary"
                              : "text-amber-400"
                          )}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">
                          {booking.venue}
                        </h3>
                        <p className="text-sm text-muted-foreground truncate">
                          {booking.requested_by}
                        </p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {format(new Date(booking.date), "MMM d, yyyy")}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatTimeDisplay(booking.start_time)} -{" "}
                            {formatTimeDisplay(booking.end_time)}
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
                <h2 className="font-semibold text-foreground text-lg mb-6">
                  Booking Request Details
                </h2>

                <div className="space-y-5">
                  {/* User */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                      User
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-white text-xs font-semibold">
                        {selectedBooking.requested_by
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div>
                        <span className="text-foreground block">
                          {selectedBooking.requested_by}
                        </span>
                        {selectedBooking.email && (
                          <span className="text-xs text-muted-foreground">
                            {selectedBooking.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        Date
                      </p>
                      <p className="text-foreground">
                        {format(new Date(selectedBooking.date), "d MMMM, yyyy")}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                        Time
                      </p>
                      <div className="inline-block px-3 py-2 rounded-lg bg-primary/20 text-primary">
                        {formatTimeDisplay(selectedBooking.start_time)} -{" "}
                        {formatTimeDisplay(selectedBooking.end_time)}
                      </div>
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                      Purpose
                    </p>
                    <div className="px-4 py-3 rounded-lg bg-muted text-foreground">
                      {selectedBooking.purpose || "No purpose specified"}
                    </div>
                  </div>

                  {/* Admin Remarks */}
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">
                      Admin Remarks (optional)
                    </p>
                    <Textarea
                      value={adminRemarks}
                      onChange={(e) => setAdminRemarks(e.target.value)}
                      placeholder="Add remarks or reason for rejection..."
                      className="bg-muted border-border text-foreground min-h-[80px] placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleApprove}
                      disabled={processing}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                    >
                      <Check size={16} className="mr-2" />
                      {processing ? "Processing..." : "Approve"}
                    </Button>
                    <Button
                      onClick={handleReject}
                      disabled={processing}
                      variant="destructive"
                      className="flex-1"
                    >
                      <X size={16} className="mr-2" />
                      {processing ? "Processing..." : "Reject"}
                    </Button>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    An email notification will be sent to the user upon your
                    decision.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
