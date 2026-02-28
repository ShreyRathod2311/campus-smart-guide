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

// Source document interface
interface SourceDoc {
  id: string;
  title: string;
  category: string;
  source: string | null;
  similarity?: number;
}

// Function to get embedding from OpenAI (optional - requires OPENAI_API_KEY)
async function getEmbedding(text: string): Promise<number[] | null> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
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

// Check if user is requesting image generation
function detectImageRequest(message: string): { wantsImage: boolean; imagePrompt: string } {
  const imageKeywords = [
    /generate\s+(an?\s+)?image/i,
    /create\s+(an?\s+)?image/i,
    /draw\s+(an?\s+)?/i,
    /show\s+me\s+(an?\s+)?(image|picture|diagram)/i,
    /make\s+(an?\s+)?(image|picture|diagram)/i,
    /visualize/i,
    /illustration\s+of/i,
    /diagram\s+of/i,
    /picture\s+of/i,
  ];

  for (const pattern of imageKeywords) {
    if (pattern.test(message)) {
      return { wantsImage: true, imagePrompt: message };
    }
  }

  return { wantsImage: false, imagePrompt: "" };
}

// Generate image using OpenAI DALL-E (if API key available)
async function generateImage(prompt: string): Promise<string | null> {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiKey) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Campus/educational themed: ${prompt}`,
        n: 1,
        size: "1024x1024",
        quality: "standard",
      }),
    });

    if (!response.ok) {
      console.error("Image generation error:", await response.text());
      return null;
    }

    const data = await response.json();
    return data.data[0]?.url || null;
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
}

// Function to search for relevant campus documents using RAG
async function searchCampusDocuments(query: string): Promise<{ context: string; sources: SourceDoc[] }> {
  const sources: SourceDoc[] = [];
  
  // First try vector similarity search if embeddings are available
  const embedding = await getEmbedding(query);
  
  if (embedding) {
    try {
      const { data: docs, error } = await supabase.rpc("match_campus_documents", {
        query_embedding: embedding,
        match_threshold: 0.5,
        match_count: 3,
      });

      if (!error && docs && docs.length > 0) {
        for (const doc of docs) {
          sources.push({
            id: doc.id,
            title: doc.title,
            category: doc.category,
            source: doc.source,
            similarity: Math.round(doc.similarity * 100),
          });
        }
        
        const context = docs
          .map(
            (doc: any) =>
              `**${doc.title}** (${doc.category}, Relevance: ${Math.round(doc.similarity * 100)}%)\n${doc.content}\nSource: ${doc.source}`
          )
          .join("\n\n---\n\n");
        
        return { context, sources };
      }
    } catch (e) {
      console.error("Vector search error:", e);
    }
  }

  // Fallback to keyword search
  try {
    const keywords = query.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2);
    const { data: docs } = await supabase
      .from("campus_documents")
      .select("id, title, content, category, source, tags")
      .eq("is_active", true)
      .limit(5);

    if (docs && docs.length > 0) {
      // Simple keyword matching on content and tags
      type DocType = { id: string; title: string; content: string; category: string; source: string | null; tags: string[] | null };
      type ScoredDoc = DocType & { score: number };
      const scored = docs.map((doc: DocType) => {
        const contentLower = (doc.content + " " + doc.title + " " + (doc.tags || []).join(" ")).toLowerCase();
        const score = keywords.filter((k: string) => contentLower.includes(k)).length;
        return { ...doc, score };
      }).filter((d: ScoredDoc) => d.score > 0).sort((a: ScoredDoc, b: ScoredDoc) => b.score - a.score).slice(0, 3);

      if (scored.length > 0) {
        for (const doc of scored) {
          sources.push({
            id: doc.id,
            title: doc.title,
            category: doc.category,
            source: doc.source,
          });
        }
        
        const context = scored
          .map((doc: { title: string; category: string; content: string; source: string | null }) => `**${doc.title}** (${doc.category})\n${doc.content}\nSource: ${doc.source}`)
          .join("\n\n---\n\n");
        
        return { context, sources };
      }
    }
  } catch (e) {
    console.error("Keyword search error:", e);
  }

  return { context: "", sources: [] };
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
Use the above context to provide accurate, campus-specific answers. Always cite the source mentioned in the context.`;
  }

  return basePrompt;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS")
    return new Response(null, { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Get the latest user message for RAG search
    const userMessages = messages.filter((m: any) => m.role === "user");
    const latestUserMessage = userMessages[userMessages.length - 1]?.content || "";

    // Check if user wants an image
    const { wantsImage, imagePrompt } = detectImageRequest(latestUserMessage);
    let generatedImageUrl: string | null = null;
    
    if (wantsImage) {
      generatedImageUrl = await generateImage(imagePrompt);
    }

    // Perform RAG search for relevant campus documents
    let ragContext = "";
    let sources: SourceDoc[] = [];
    if (latestUserMessage) {
      try {
        const ragResult = await searchCampusDocuments(latestUserMessage);
        ragContext = ragResult.context;
        sources = ragResult.sources;
        console.log("RAG context found:", ragContext ? "Yes" : "No", "Sources:", sources.length);
      } catch (e) {
        console.error("RAG search failed:", e);
      }
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
          messages: [
            { role: "system", content: systemPrompt },
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

    // Create a TransformStream to prepend metadata to the response
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const encoder = new TextEncoder();

    // Start async processing
    (async () => {
      try {
        // Send metadata as the first event
        const metadata = {
          type: "metadata",
          sources: sources,
          generatedImage: generatedImageUrl,
        };
        await writer.write(encoder.encode(`data: ${JSON.stringify(metadata)}\n\n`));

        // Pipe the AI response stream
        const reader = response.body!.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
      } catch (e) {
        console.error("Stream error:", e);
      } finally {
        await writer.close();
      }
    })();

    return new Response(readable, {
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
