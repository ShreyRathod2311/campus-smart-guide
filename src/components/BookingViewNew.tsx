import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Venue {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
}

const TIME_SLOTS = [
  { time: "08:00", label: "8 AM" },
  { time: "09:00", label: "9 AM" },
  { time: "10:00", label: "10 AM" },
  { time: "11:00", label: "11 AM" },
  { time: "12:00", label: "12 PM" },
  { time: "14:00", label: "2 PM" },
  { time: "15:00", label: "3 PM" },
  { time: "16:00", label: "4 PM" },
  { time: "17:00", label: "5 PM" },
  { time: "18:00", label: "6 PM" },
  { time: "19:00", label: "7 PM" },
  { time: "20:00", label: "8 PM" },
];

const DURATIONS = [
  { value: "1", label: "1 hour" },
  { value: "2", label: "2 hours" },
  { value: "3", label: "3 hours" },
  { value: "4", label: "4 hours" },
];

const QUICK_BOOKING_PROMPTS = [
  "Book Lab 3 for tomorrow 2 PM",
  "Is seminar hall free on Friday?",
  "Reserve conf room for 2 hours Monday",
];

export default function BookingViewNew() {
  const { user, profile } = useAuth();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [duration, setDuration] = useState("1");
  const [startTime, setStartTime] = useState("08:00");
  const [purpose, setPurpose] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [userBookings, setUserBookings] = useState<string[]>([]);

  useEffect(() => {
    supabase.from("venues").select("*").eq("is_active", true).then(({ data }) => {
      if (data) {
        setVenues(data);
        if (data.length > 0) setSelectedVenue(data[0].name);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedVenue && date) {
      supabase
        .from("bookings")
        .select("*")
        .eq("venue", selectedVenue)
        .eq("date", format(date, "yyyy-MM-dd"))
        .neq("status", "cancelled")
        .neq("status", "rejected")
        .then(({ data }) => {
          if (data) {
            setExistingBookings(data);
            // Find user's own bookings
            const userSlots = data
              .filter(b => b.email === user?.email || b.requested_by === profile?.full_name)
              .flatMap(b => {
                const slots = [];
                let current = b.start_time;
                while (current < b.end_time) {
                  slots.push(current.slice(0, 5));
                  const hour = parseInt(current.slice(0, 2)) + 1;
                  current = `${hour.toString().padStart(2, '0')}:00`;
                }
                return slots;
              });
            setUserBookings(userSlots);
          }
        });
    }
  }, [selectedVenue, date, user, profile]);

  const getSlotStatus = (time: string): "available" | "booked" | "yours" => {
    const timeStr = time.slice(0, 5);
    if (userBookings.includes(timeStr)) return "yours";
    const isBooked = existingBookings.some(
      (b) => timeStr >= b.start_time.slice(0, 5) && timeStr < b.end_time.slice(0, 5)
    );
    return isBooked ? "booked" : "available";
  };

  const handleSubmit = async () => {
    if (!selectedVenue || !date || !startTime || !purpose) {
      toast.error("Please fill all required fields.");
      return;
    }

    const endHour = parseInt(startTime.slice(0, 2)) + parseInt(duration);
    const endTime = `${endHour.toString().padStart(2, '0')}:00`;

    setIsSubmitting(true);
    const { error } = await supabase.from("bookings").insert({
      venue: selectedVenue,
      date: format(date, "yyyy-MM-dd"),
      start_time: startTime,
      end_time: endTime,
      purpose,
      requested_by: profile?.full_name || user?.email || "Unknown",
      email: user?.email,
    });

    if (error) {
      toast.error("Failed to submit booking. Please try again.");
    } else {
      toast.success("Booking request submitted for approval!");
      setPurpose("");
    }
    setIsSubmitting(false);
  };

  const selectedVenueData = venues.find((v) => v.name === selectedVenue);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-background p-6">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left - Booking Form */}
          <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">Booking Details</h1>

            {/* Venue Selection */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Select Venue</label>
              <Select value={selectedVenue} onValueChange={setSelectedVenue}>
                <SelectTrigger className="w-full bg-card border-border text-foreground h-12">
                  <SelectValue placeholder="Select a venue" />
                </SelectTrigger>
                <SelectContent>
                  {venues.map((v) => (
                    <SelectItem key={v.id} value={v.name}>
                      {v.name} {v.capacity && `(${v.capacity} seats)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date and Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal h-12 bg-card border-border text-foreground hover:bg-muted",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "dd / MM / yy") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(d) => d && setDate(d)}
                      disabled={(d) => d < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Duration</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger className="w-full bg-card border-border text-foreground h-12">
                    <SelectValue placeholder="Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Start Time */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Time</label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger className="w-full bg-card border-border text-foreground h-12">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_SLOTS.map((slot) => (
                    <SelectItem 
                      key={slot.time} 
                      value={slot.time}
                      disabled={getSlotStatus(slot.time) === "booked"}
                    >
                      {slot.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Purpose / Remarks</label>
              <Textarea
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="e.g., Project presentation for CS302, approx. 25 students..."
                className="bg-card border-border text-foreground min-h-[100px] placeholder:text-muted-foreground"
              />
            </div>

            {/* Info Note */}
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Info size={14} className="text-primary mt-0.5 shrink-0" />
              <span>A confirmation request will be sent to the CSIS office for approval.</span>
            </div>

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !selectedVenue || !purpose}
              className="w-full h-12"
            >
              {isSubmitting ? "Submitting..." : "Check Availability & Request Booking"}
            </Button>
          </div>

          {/* Right - Availability Preview & Quick Booking */}
          <div className="space-y-6">
            {/* Availability Preview */}
            <div>
              <h2 className="text-xl font-bold text-foreground mb-1">Availability Preview</h2>
              <p className="text-sm text-muted-foreground mb-4">Lab 3 • Today</p>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {TIME_SLOTS.map((slot) => {
                  const status = getSlotStatus(slot.time);
                  return (
                    <button
                      key={slot.time}
                      onClick={() => status === "available" && setStartTime(slot.time)}
                      disabled={status === "booked"}
                      className={cn(
                        "py-3 px-2 rounded-lg text-sm font-medium transition-all",
                        status === "available" && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30",
                        status === "booked" && "bg-rose-500/20 text-rose-400 border border-rose-500/30 cursor-not-allowed",
                        status === "yours" && "bg-violet-500/20 text-violet-400 border border-violet-500/30",
                        startTime === slot.time && status === "available" && "ring-2 ring-emerald-500"
                      )}
                    >
                      <span className="text-xs mr-1">
                        {status === "available" ? "✓" : status === "booked" ? "×" : "★"}
                      </span>
                      {slot.label}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex gap-6 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-rose-500/30 border border-rose-500/50" />
                  <span>Booked</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-violet-500/30 border border-violet-500/50" />
                  <span>Your Slot</span>
                </div>
              </div>
            </div>

            {/* Quick Booking via Chat */}
            <div className="bg-card rounded-xl p-5 border border-border">
              <h3 className="font-semibold text-foreground mb-2">Quick Booking via Chat</h3>
              <p className="text-sm text-muted-foreground mb-4">Try saying:</p>
              <div className="space-y-2">
                {QUICK_BOOKING_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    className="w-full text-left px-4 py-3 rounded-lg bg-primary/10 border border-primary/20 text-primary text-sm hover:bg-primary/20 transition-colors"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
