// @ts-nocheck - Deno Edge Function (types not available in VS Code)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Initialize Supabase client for database access
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Function to get embedding from OpenAI
async function getEmbedding(text: string): Promise<number[] | null> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    console.warn("OPENAI_API_KEY not set, skipping RAG");
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: text,
      }),
    });

    if (!response.ok) {
      console.error("Embedding API error:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("Error getting embedding:", error);
    return null;
  }
}

// Function to search for relevant campus documents using RAG
async function searchCampusDocuments(query: string): Promise<string> {
  const embedding = await getEmbedding(query);
  
  if (!embedding) {
    // Fallback to keyword search if embedding fails
    const { data: docs } = await supabase
      .from("campus_documents")
      .select("title, content, category, source")
      .textSearch("content", query.split(" ").join(" | "), { type: "websearch" })
      .limit(3);

    if (docs && docs.length > 0) {
      return docs
        .map((doc: { title: string; category: string; content: string; source: string }) => `**${doc.title}** (${doc.category})\n${doc.content}\nSource: ${doc.source}`)
        .join("\n\n---\n\n");
    }
    return "";
  }

  // Use vector similarity search
  const { data: docs, error } = await supabase.rpc("match_campus_documents", {
    query_embedding: embedding,
    match_threshold: 0.5,
    match_count: 3,
  });

  if (error) {
    console.error("RAG search error:", error);
    return "";
  }

  if (docs && docs.length > 0) {
    return docs
      .map(
        (doc: any) =>
          `**${doc.title}** (${doc.category}, Relevance: ${Math.round(doc.similarity * 100)}%)\n${doc.content}\nSource: ${doc.source}`
      )
      .join("\n\n---\n\n");
  }

  return "";
}

// Build system prompt with RAG context
function buildSystemPrompt(ragContext: string): string {
  let basePrompt = `You are CSIS SmartAssist, an AI-powered campus assistant for the CSIS (Computer Science & Information Systems) department at BITS Pilani Goa Campus.

Your role is to help students, faculty, and administrative staff with:
1. Academic queries (TA applications, course information, exam schedules, academic policies)
2. Administrative procedures (bill forwarding, reimbursement workflows, form submissions)
3. Lab and room booking assistance (checking availability, suggesting slots)
4. Department policies and guidelines
5. General campus information

Guidelines:
- Always cite your source when providing policy information (e.g., "Source: TA Guidelines Circular, Aug 2025")
- Be concise but thorough
- If you don't know something, say so and suggest who to contact
- For booking requests, guide users to use the booking interface
- Use markdown formatting for better readability
- Be friendly and professional
- Prioritize information from the knowledge base context when available`;

  if (ragContext) {
    basePrompt += `

---
RELEVANT KNOWLEDGE BASE CONTEXT:
The following information is from our campus knowledge base and is highly relevant to the user's query. Use this as your primary source of information:

${ragContext}

---
Use the above context to provide accurate, campus-specific answers. If the context doesn't fully answer the question, supplement with your general knowledge but indicate when you're doing so.`;
  }

  return basePrompt;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get the latest user message for RAG search
    const userMessages = messages.filter((m: any) => m.role === "user");
    const latestUserMessage = userMessages[userMessages.length - 1]?.content || "";

    // Perform RAG search for relevant campus documents
    let ragContext = "";
    if (latestUserMessage) {
      ragContext = await searchCampusDocuments(latestUserMessage);
      console.log("RAG context found:", ragContext ? "Yes" : "No");
    }

    // Build system prompt with RAG context
    const systemPrompt = buildSystemPrompt(ragContext);

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
          messages: [{ role: "system", content: systemPrompt }, ...messages],
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
