import { useState, useEffect } from "react";
import { format } from "date-fns";
import { CalendarIcon, Clock, MapPin, Users, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Venue {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  floor: string | null;
  equipment: string[] | null;
}

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00", "18:00",
];

export default function BookingView() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [selectedVenue, setSelectedVenue] = useState("");
  const [date, setDate] = useState<Date>();
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  useEffect(() => {
    supabase.from("venues").select("*").eq("is_active", true).then(({ data }) => {
      if (data) setVenues(data);
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
          if (data) setExistingBookings(data);
        });
    }
  }, [selectedVenue, date]);

  const isSlotBooked = (time: string) => {
    return existingBookings.some(
      (b) => time >= b.start_time && time < b.end_time
    );
  };

  const handleSubmit = async () => {
    if (!selectedVenue || !date || !startTime || !endTime || !name) {
      toast.error("Please fill all required fields.");
      return;
    }
    if (startTime >= endTime) {
      toast.error("End time must be after start time.");
      return;
    }

    setIsSubmitting(true);
    const { error } = await supabase.from("bookings").insert({
      venue: selectedVenue,
      date: format(date, "yyyy-MM-dd"),
      start_time: startTime,
      end_time: endTime,
      purpose,
      requested_by: name,
      email,
    });

    if (error) {
      toast.error("Failed to submit booking. Please try again.");
    } else {
      setSubmitted(true);
      toast.success("Booking request submitted for approval!");
    }
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center h-full animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
          <Check className="text-success" size={40} />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground mb-2">Booking Submitted!</h2>
        <p className="text-muted-foreground text-center max-w-md mb-6">
          Your booking request has been sent to the CSIS office for approval. You'll receive a confirmation once it's processed.
        </p>
        <Button onClick={() => { setSubmitted(false); setSelectedVenue(""); setDate(undefined); setStartTime(""); setEndTime(""); setPurpose(""); }}>
          Book Another Room
        </Button>
      </div>
    );
  }

  const selectedVenueData = venues.find((v) => v.name === selectedVenue);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 overflow-y-auto h-full scrollbar-thin">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-foreground mb-2">Book a Lab or Room</h1>
        <p className="text-muted-foreground">Select a venue, date, and time slot. Your request will be sent for admin approval.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Venue Selection */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <MapPin size={18} className="text-primary" />
              Select Venue
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {venues.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVenue(v.name)}
                  className={cn(
                    "p-4 rounded-xl border text-left transition-all duration-200",
                    selectedVenue === v.name
                      ? "border-primary bg-primary/5 shadow-glow"
                      : "border-border bg-background hover:border-primary/30"
                  )}
                >
                  <p className="font-medium text-sm text-foreground">{v.name}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    {v.capacity && (
                      <span className="flex items-center gap-1">
                        <Users size={12} /> {v.capacity} seats
                      </span>
                    )}
                    {v.floor && <span>{v.floor}</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date & Time */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground flex items-center gap-2">
              <Clock size={18} className="text-primary" />
              Date & Time
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      disabled={(d) => d < new Date()}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Start Time</label>
                <Select value={startTime} onValueChange={setStartTime}>
                  <SelectTrigger><SelectValue placeholder="Start" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.map((t) => (
                      <SelectItem key={t} value={t} disabled={isSlotBooked(t)}>
                        {t} {isSlotBooked(t) ? "(Booked)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">End Time</label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger><SelectValue placeholder="End" /></SelectTrigger>
                  <SelectContent>
                    {TIME_SLOTS.filter((t) => t > startTime).map((t) => (
                      <SelectItem key={t} value={t} disabled={isSlotBooked(t)}>
                        {t} {isSlotBooked(t) ? "(Booked)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Availability preview */}
            {selectedVenue && date && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Availability — {format(date, "EEE, MMM d")}</p>
                <div className="flex gap-1.5 flex-wrap">
                  {TIME_SLOTS.map((t) => {
                    const booked = isSlotBooked(t);
                    return (
                      <div
                        key={t}
                        className={cn(
                          "px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                          booked
                            ? "bg-destructive/10 text-destructive"
                            : "bg-success/10 text-success"
                        )}
                      >
                        {t}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-success/20" /> Available</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-destructive/20" /> Booked</span>
                </div>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="bg-card rounded-xl border border-border p-6 space-y-4">
            <h3 className="font-display font-semibold text-foreground">Booking Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Your Name *</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Prof. Sharma" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@goa.bits-pilani.ac.in" type="email" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Purpose / Remarks</label>
              <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g., DBMS lab session for CS F212, approx. 30 students" rows={3} />
            </div>
          </div>
        </div>

        {/* Summary Card */}
        <div className="lg:col-span-1">
          <div className="bg-card rounded-xl border border-border p-6 sticky top-6 space-y-5">
            <h3 className="font-display font-semibold text-foreground">Booking Summary</h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Venue</span>
                <span className="font-medium text-foreground">{selectedVenue || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium text-foreground">{date ? format(date, "MMM d, yyyy") : "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium text-foreground">{startTime && endTime ? `${startTime} – ${endTime}` : "—"}</span>
              </div>
              {selectedVenueData?.capacity && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className="font-medium text-foreground">{selectedVenueData.capacity} seats</span>
                </div>
              )}
              {selectedVenueData?.equipment && (
                <div>
                  <span className="text-muted-foreground text-xs">Equipment</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedVenueData.equipment.map((eq) => (
                      <span key={eq} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">{eq}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-4">
                A confirmation request will be sent to the CSIS office for approval.
              </p>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
                {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                {isSubmitting ? "Submitting..." : "Request Booking"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
