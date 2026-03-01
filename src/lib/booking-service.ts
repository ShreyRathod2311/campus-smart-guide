/**
 * Booking Service
 * Handles room/lab booking, Google Calendar link generation, and email notifications.
 */
import { supabase } from "@/integrations/supabase/client";
import { format, parse } from "date-fns";

// ─── Types ──────────────────────────────────────────────────

export interface BookingRequest {
  venue: string;
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  purpose: string;
  requestedBy: string;
  email: string;
  userId?: string;
}

export interface BookingResult {
  success: boolean;
  bookingId?: string;
  calendarUrl?: string;
  error?: string;
}

export interface Venue {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  floor: string | null;
  equipment: string[] | null;
  is_active: boolean;
}

const ADMIN_EMAIL = "f20220064@goa.bits-pilani.ac.in"; // Department admin email

// ─── Venues ─────────────────────────────────────────────────

export async function fetchVenues(): Promise<Venue[]> {
  const { data, error } = await supabase
    .from("venues")
    .select("*")
    .eq("is_active", true);
  if (error) {
    console.error("fetchVenues error:", error);
    return [];
  }
  return data as Venue[];
}

// ─── Availability ───────────────────────────────────────────

export interface BookingSlot {
  start_time: string;
  end_time: string;
  status: string;
  email: string | null;
  requested_by: string;
  user_id: string | null;
}

export async function checkAvailability(
  venue: string,
  date: string
): Promise<BookingSlot[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select("start_time, end_time, status, email, requested_by, user_id")
    .eq("venue", venue)
    .eq("date", date)
    .in("status", ["pending", "approved"]);
  if (error) {
    console.error("checkAvailability error:", error);
    return [];
  }
  return (data ?? []) as BookingSlot[];
}

export function isSlotAvailable(
  existingBookings: { start_time: string; end_time: string }[],
  startTime: string,
  endTime: string
): boolean {
  return !existingBookings.some(
    (b) => startTime < b.end_time && endTime > b.start_time
  );
}

// ─── Create Booking ─────────────────────────────────────────

export async function createBooking(req: BookingRequest): Promise<BookingResult> {
  // 1. Check availability
  const existing = await checkAvailability(req.venue, req.date);
  if (!isSlotAvailable(existing, req.startTime, req.endTime)) {
    return { success: false, error: "This time slot is already booked. Please choose another." };
  }

  // 2. Insert booking
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      venue: req.venue,
      date: req.date,
      start_time: req.startTime,
      end_time: req.endTime,
      purpose: req.purpose,
      requested_by: req.requestedBy,
      email: req.email,
      user_id: req.userId,
      status: "pending",
    })
    .select()
    .single();

  if (error) {
    console.error("createBooking error:", error);
    return { success: false, error: "Failed to create booking. Please try again." };
  }

  const bookingId = data.id;

  // 3. Generate Google Calendar link
  const calendarUrl = generateGoogleCalendarUrl({
    title: `Room Booking: ${req.venue}`,
    description: `Purpose: ${req.purpose}\nRequested by: ${req.requestedBy}\nStatus: Pending Approval`,
    location: req.venue,
    date: req.date,
    startTime: req.startTime,
    endTime: req.endTime,
  });

  // 4. Send email notifications (fire-and-forget)
  sendBookingEmails({
    bookingId,
    venue: req.venue,
    date: req.date,
    startTime: req.startTime,
    endTime: req.endTime,
    purpose: req.purpose,
    requestedBy: req.requestedBy,
    userEmail: req.email,
    action: "created",
  }).catch((err) => console.error("Email notification error:", err));

  return { success: true, bookingId, calendarUrl };
}

// ─── Google Calendar URL ────────────────────────────────────

interface CalendarEvent {
  title: string;
  description: string;
  location: string;
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
}

export function generateGoogleCalendarUrl(event: CalendarEvent): string {
  // Parse date and times into ISO format for Google Calendar
  const dateObj = parse(event.date, "yyyy-MM-dd", new Date());

  const startHour = parseInt(event.startTime.split(":")[0]);
  const startMin = parseInt(event.startTime.split(":")[1] || "0");
  const endHour = parseInt(event.endTime.split(":")[0]);
  const endMin = parseInt(event.endTime.split(":")[1] || "0");

  const startDate = new Date(dateObj);
  startDate.setHours(startHour, startMin, 0, 0);

  const endDate = new Date(dateObj);
  endDate.setHours(endHour, endMin, 0, 0);

  // Google Calendar uses YYYYMMDDTHHmmSS format
  const formatGCal = (d: Date) =>
    d.getFullYear().toString() +
    (d.getMonth() + 1).toString().padStart(2, "0") +
    d.getDate().toString().padStart(2, "0") +
    "T" +
    d.getHours().toString().padStart(2, "0") +
    d.getMinutes().toString().padStart(2, "0") +
    "00";

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGCal(startDate)}/${formatGCal(endDate)}`,
    details: event.description,
    location: event.location,
    sf: "true",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ─── Email Notifications ────────────────────────────────────

interface EmailPayload {
  bookingId: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  requestedBy: string;
  userEmail: string;
  action: "created" | "approved" | "rejected";
  adminRemarks?: string;
}

export async function sendBookingEmails(payload: EmailPayload): Promise<void> {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/booking-notify`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify({
        ...payload,
        adminEmail: ADMIN_EMAIL,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      console.error("booking-notify edge function error:", resp.status, text);
    }
  } catch (err) {
    console.error("Failed to call booking-notify:", err);
  }
}

// ─── Approval Actions ───────────────────────────────────────

export async function approveBooking(
  bookingId: string,
  adminRemarks?: string
): Promise<{ success: boolean; calendarUrl?: string; error?: string }> {
  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (fetchErr || !booking) {
    return { success: false, error: "Booking not found." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: "approved", admin_remarks: adminRemarks || null })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: "Failed to approve booking." };
  }

  const calendarUrl = generateGoogleCalendarUrl({
    title: `✅ Approved: ${booking.venue}`,
    description: `Purpose: ${booking.purpose}\nRequested by: ${booking.requested_by}\nStatus: Approved${adminRemarks ? `\nRemarks: ${adminRemarks}` : ""}`,
    location: booking.venue,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
  });

  // Send approval email
  sendBookingEmails({
    bookingId,
    venue: booking.venue,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    purpose: booking.purpose || "",
    requestedBy: booking.requested_by,
    userEmail: booking.email || "",
    action: "approved",
    adminRemarks,
  }).catch((err) => console.error("Approval email error:", err));

  return { success: true, calendarUrl };
}

export async function rejectBooking(
  bookingId: string,
  adminRemarks?: string
): Promise<{ success: boolean; error?: string }> {
  const { data: booking, error: fetchErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (fetchErr || !booking) {
    return { success: false, error: "Booking not found." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: "rejected", admin_remarks: adminRemarks || null })
    .eq("id", bookingId);

  if (error) {
    return { success: false, error: "Failed to reject booking." };
  }

  // Send rejection email
  sendBookingEmails({
    bookingId,
    venue: booking.venue,
    date: booking.date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    purpose: booking.purpose || "",
    requestedBy: booking.requested_by,
    userEmail: booking.email || "",
    action: "rejected",
    adminRemarks,
  }).catch((err) => console.error("Rejection email error:", err));

  return { success: true };
}

// ─── Chat Booking Helper ────────────────────────────────────

/** Parse a natural-language booking request from the chat. */
export function parseBookingIntent(message: string): {
  isBooking: boolean;
  venue?: string;
  date?: string;
  time?: string;
  duration?: string;
  purpose?: string;
} {
  const lower = message.toLowerCase();

  // Check if this is a booking request
  const bookingKeywords = [
    "book", "reserve", "booking", "reservation",
    "schedule", "need a room", "need a lab", "need the",
    "want to book", "want to reserve",
  ];
  const isBooking = bookingKeywords.some((kw) => lower.includes(kw));
  if (!isBooking) return { isBooking: false };

  // Try to extract venue
  const venuePatterns = [
    /lab\s*(\d)/i,
    /lab\s*-?\s*(ai|ml|network|software|data)/i,
    /seminar\s*hall/i,
    /conference\s*room/i,
    /classroom/i,
  ];
  let venue: string | undefined;
  for (const pat of venuePatterns) {
    const match = lower.match(pat);
    if (match) {
      venue = match[0];
      break;
    }
  }

  // Try to extract date
  const tomorrow = /tomorrow/i.test(lower) ? "tomorrow" : undefined;
  const todayMatch = /today/i.test(lower) ? "today" : undefined;
  const dayMatch = lower.match(
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
  );
  const dateStr = tomorrow || todayMatch || dayMatch?.[0];

  // Try to extract time
  const timeMatch = lower.match(/(\d{1,2})\s*(am|pm)/i);
  const time = timeMatch
    ? `${timeMatch[1]}:00 ${timeMatch[2].toUpperCase()}`
    : undefined;

  // Try to extract duration
  const durationMatch = lower.match(/(\d+)\s*hours?/i);
  const duration = durationMatch ? durationMatch[1] : undefined;

  return { isBooking: true, venue, date: dateStr, time, duration };
}

/** Format a time string for display. */
export function formatTimeDisplay(time: string): string {
  const hour = parseInt(time.slice(0, 2));
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${time.slice(3, 5)} ${ampm}`;
}

/** Format a date for display. */
export function formatDateDisplay(dateStr: string): string {
  try {
    const d = parse(dateStr, "yyyy-MM-dd", new Date());
    return format(d, "EEEE, MMMM d, yyyy");
  } catch {
    return dateStr;
  }
}
