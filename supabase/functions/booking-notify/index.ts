// @ts-nocheck - Deno Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nodemailer from "npm:nodemailer@6";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Booking Notification Edge Function (Nodemailer + SMTP)
 *
 * Sends email notifications to users and admin when bookings are
 * created / approved / rejected.
 *
 * Required env vars:
 *   SMTP_HOST  – e.g. smtp.gmail.com
 *   SMTP_PORT  – e.g. 587
 *   SMTP_USER  – e.g. your-email@gmail.com
 *   SMTP_PASS  – app password (NOT your normal password)
 *   FROM_EMAIL – sender address shown in emails
 *
 * Expected JSON body:
 *  { bookingId, venue, date, startTime, endTime, purpose,
 *    requestedBy, userEmail, adminEmail, action, adminRemarks? }
 */

const SMTP_HOST = Deno.env.get("SMTP_HOST") ?? "";
const SMTP_PORT = parseInt(Deno.env.get("SMTP_PORT") ?? "587");
const SMTP_USER = Deno.env.get("SMTP_USER") ?? "";
const SMTP_PASS = Deno.env.get("SMTP_PASS") ?? "";
const FROM_EMAIL = Deno.env.get("FROM_EMAIL") ?? SMTP_USER || "noreply@campus-smart-guide.com";

// Create reusable transporter
function createTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return null;
  }
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for 587
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
}

interface BookingPayload {
  bookingId: string;
  venue: string;
  date: string;
  startTime: string;
  endTime: string;
  purpose: string;
  requestedBy: string;
  userEmail: string;
  adminEmail: string;
  action: "created" | "approved" | "rejected";
  adminRemarks?: string;
}

function formatTime12(time: string): string {
  const hour = parseInt(time.slice(0, 2));
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${time.slice(3, 5)} ${ampm}`;
}

function buildUserEmail(p: BookingPayload): { subject: string; html: string } {
  if (p.action === "created") {
    return {
      subject: `Booking Request Submitted – ${p.venue}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#4F46E5">Booking Request Submitted ✓</h2>
          <p>Hi <strong>${p.requestedBy}</strong>,</p>
          <p>Your booking request has been submitted and is <strong>pending approval</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Venue</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${p.venue}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Date</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${p.date}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Time</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${formatTime12(p.startTime)} – ${formatTime12(p.endTime)}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Purpose</td><td style="padding:8px;border-bottom:1px solid #eee">${p.purpose}</td></tr>
          </table>
          <p style="color:#666;font-size:14px">You'll receive another email once the admin reviews your request.</p>
          <p style="color:#999;font-size:12px;margin-top:24px">— CSIS Campus Smart Guide</p>
        </div>`,
    };
  }

  if (p.action === "approved") {
    return {
      subject: `✅ Booking Approved – ${p.venue}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#059669">Booking Approved ✅</h2>
          <p>Hi <strong>${p.requestedBy}</strong>,</p>
          <p>Great news! Your booking has been <strong style="color:#059669">approved</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Venue</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${p.venue}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Date</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${p.date}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Time</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${formatTime12(p.startTime)} – ${formatTime12(p.endTime)}</strong></td></tr>
            <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Purpose</td><td style="padding:8px;border-bottom:1px solid #eee">${p.purpose}</td></tr>
            ${p.adminRemarks ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Admin Remarks</td><td style="padding:8px;border-bottom:1px solid #eee">${p.adminRemarks}</td></tr>` : ""}
          </table>
          <p style="color:#999;font-size:12px;margin-top:24px">— CSIS Campus Smart Guide</p>
        </div>`,
    };
  }

  // rejected
  return {
    subject: `❌ Booking Rejected – ${p.venue}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#DC2626">Booking Rejected ❌</h2>
        <p>Hi <strong>${p.requestedBy}</strong>,</p>
        <p>Unfortunately, your booking has been <strong style="color:#DC2626">rejected</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Venue</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${p.venue}</strong></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Date</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${p.date}</strong></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Time</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${formatTime12(p.startTime)} – ${formatTime12(p.endTime)}</strong></td></tr>
          ${p.adminRemarks ? `<tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Reason</td><td style="padding:8px;border-bottom:1px solid #eee">${p.adminRemarks}</td></tr>` : ""}
        </table>
        <p style="color:#666;font-size:14px">You can try booking a different slot or contact the admin for more information.</p>
        <p style="color:#999;font-size:12px;margin-top:24px">— CSIS Campus Smart Guide</p>
      </div>`,
  };
}

function buildAdminEmail(p: BookingPayload): { subject: string; html: string } | null {
  if (p.action !== "created") return null; // Admin only notified on new bookings

  return {
    subject: `New Booking Request – ${p.venue} by ${p.requestedBy}`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#4F46E5">New Booking Request 📋</h2>
        <p>A new booking request has been submitted and needs your approval.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Requested By</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${p.requestedBy}</strong> (${p.userEmail})</td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Venue</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${p.venue}</strong></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Date</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${p.date}</strong></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Time</td><td style="padding:8px;border-bottom:1px solid #eee"><strong>${formatTime12(p.startTime)} – ${formatTime12(p.endTime)}</strong></td></tr>
          <tr><td style="padding:8px;border-bottom:1px solid #eee;color:#666">Purpose</td><td style="padding:8px;border-bottom:1px solid #eee">${p.purpose}</td></tr>
        </table>
        <p>Please log in to the <strong>Admin Approvals</strong> panel to approve or reject this request.</p>
        <p style="color:#999;font-size:12px;margin-top:24px">— CSIS Campus Smart Guide</p>
      </div>`,
  };
}

async function sendEmail(to: string, subject: string, html: string) {
  const transporter = createTransporter();

  if (!transporter) {
    console.log(`[booking-notify] EMAIL (no SMTP configured — logging only)`);
    console.log(`  To: ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body length: ${html.length} chars`);
    return { success: true, note: "logged only – no SMTP configured" };
  }

  try {
    const info = await transporter.sendMail({
      from: `"CSIS Campus Smart Guide" <${FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    console.log(`[booking-notify] Email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`[booking-notify] Nodemailer error:`, err);
    return { success: false, error: String(err) };
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: BookingPayload = await req.json();
    console.log("[booking-notify] Received:", JSON.stringify(payload));

    const results: any[] = [];

    // 1. Send user email
    const userEmail = buildUserEmail(payload);
    if (payload.userEmail) {
      const r = await sendEmail(payload.userEmail, userEmail.subject, userEmail.html);
      results.push({ recipient: "user", ...r });
    }

    // 2. Send admin email (only for new bookings)
    const adminEmailContent = buildAdminEmail(payload);
    if (adminEmailContent && payload.adminEmail) {
      const r = await sendEmail(
        payload.adminEmail,
        adminEmailContent.subject,
        adminEmailContent.html
      );
      results.push({ recipient: "admin", ...r });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[booking-notify] Error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
