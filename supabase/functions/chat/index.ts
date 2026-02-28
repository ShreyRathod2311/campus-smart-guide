import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are CSIS SmartAssist, an AI-powered campus assistant for the CSIS (Computer Science & Information Systems) department at BITS Pilani Goa Campus.

Your role is to help students, faculty, and administrative staff with:
1. Academic queries (TA applications, course information, exam schedules, academic policies)
2. Administrative procedures (bill forwarding, reimbursement workflows, form submissions)
3. Lab and room booking assistance (checking availability, suggesting slots)
4. Department policies and guidelines
5. General campus information

Key knowledge areas:
- TA Application: Students fill out the TA Application Form on the CSIS Portal, submit by deadline. Results announced in 2 weeks. Source: TA Guidelines Circular.
- Bill Forwarding: Submit bills to department office with proper documentation. Processing takes 5-7 working days. Source: Finance Policy Document.
- Lab Booking: Labs can be booked via SmartAssist. Available labs: AI & ML Lab (30 seats), Networks Lab (25 seats), Software Lab (40 seats), Data Science Lab (20 seats). Bookings require admin approval.
- Reimbursement: Submit reimbursement forms with original receipts to the accounts section. Travel reimbursements need prior approval. Source: Reimbursement Policy.
- Academic Calendar: Semester dates, exam schedules, and registration deadlines are available on the academic portal.
- Faculty Office Hours: Faculty maintain regular office hours. Check department notice board or website for schedules.

Guidelines:
- Always cite your source when providing policy information (e.g., "Source: TA Guidelines Circular, Aug 2025")
- Be concise but thorough
- If you don't know something, say so and suggest who to contact
- For booking requests, guide users to use the booking interface
- Use markdown formatting for better readability
- Be friendly and professional`;

serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI usage limit reached. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "AI service temporarily unavailable." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
