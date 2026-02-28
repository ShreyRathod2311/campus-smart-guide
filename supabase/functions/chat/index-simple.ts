// @ts-nocheck - Deno Edge Function (types not available in VS Code)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Predefined responses for common campus queries
const campusKnowledge = {
  booking: {
    keywords: ["book", "booking", "lab", "room", "reserve", "reservation", "availability"],
    response: `# Lab Booking Information

To book a lab or room on campus:

1. **Check Availability**: Use the "New Booking" section to see available slots
2. **Submit Request**: Fill in the booking form with:
   - Venue/Lab name
   - Date and time slot
   - Purpose of booking
   - Your contact information
3. **Wait for Approval**: Your request will be reviewed by the admin
4. **Track Status**: Check "My Requests" to monitor approval status

📍 Available venues:
- Lab 1 - AI & ML Lab (30 capacity)
- Lab 2 - Networks Lab (25 capacity)
- Lab 3 - Software Lab (40 capacity)
- Lab 4 - Data Science Lab (20 capacity)
- Seminar Hall A (100 capacity)
- Conference Room 101 (15 capacity)

💡 Tip: Book at least 2 days in advance for better approval chances!`,
  },
  ta: {
    keywords: ["ta", "teaching assistant", "apply", "application", "position"],
    response: `# TA Application Process

## Eligibility
- Must be a postgraduate student (MTech/PhD) or senior undergraduate (3rd/4th year)
- CGPA requirement: Usually 7.5+ for UG, 7.0+ for PG
- Good academic standing

## Application Steps
1. **Check Announcements**: TA positions are posted at the start of each semester
2. **Prepare Documents**:
   - Updated resume
   - Academic transcripts
   - Statement of interest
3. **Submit Application**: Through the official department portal
4. **Interview**: Selected candidates will be called for an interview

## Responsibilities
- Conducting tutorials and lab sessions
- Grading assignments and exams
- Holding office hours for student queries
- Assisting faculty in course management

📧 For more details, contact the faculty coordinator or department office.`,
  },
  reimbursement: {
    keywords: ["reimburse", "reimbursement", "bill", "payment", "expense"],
    response: `# Bill Reimbursement Process

## Steps for Reimbursement

1. **Collect Original Bills**: Keep all original receipts and invoices
2. **Fill Reimbursement Form**: Available at the department office or online portal
3. **Required Attachments**:
   - Original bills/receipts
   - Bank account details
   - Purpose justification (if needed)

4. **Submit to Department**: 
   - Hand over to the department office
   - Get acknowledgment receipt

5. **Approval Process**:
   - HOD approval required
   - Accounts section verification
   - Processing time: 2-4 weeks typically

## Important Notes
- Bills must be in student/faculty name
- Submit within 30 days of expense
- GST bills preferred for amounts >₹5000
- Advance intimation required for large expenses

💡 Contact accounts section for specific queries: accounts@goa.bits-pilani.ac.in`,
  },
  policy: {
    keywords: ["policy", "rule", "guideline", "regulation", "procedure"],
    response: `# Department Policies & Guidelines

## Academic Policies
- **Attendance**: 75% minimum required for course completion
- **Late Submission**: Penalties as per course instructor discretion
- **Academic Integrity**: Zero tolerance for plagiarism
- **Grade Appeals**: Can be filed within 7 days of grade publication

## Lab Usage Policies
- Book in advance; walk-ins subject to availability
- Respect equipment; report damages immediately
- No food/drinks in labs
- Log out and clean workspace after use

## Administrative Policies
- **Office Hours**: 9:00 AM - 5:00 PM (Monday-Friday)
- **Email Response Time**: Within 2 business days
- **Document Requests**: Allow 3-5 working days

## Code of Conduct
- Professional behavior expected at all times
- Respect diversity and inclusivity
- Follow safety protocols in labs
- Maintain confidentiality of sensitive information

📚 For detailed policy documents, visit the department website or contact the office.`,
  },
  general: {
    keywords: ["hello", "hi", "help", "what", "how", "campus", "csis", "department"],
    response: `# Welcome to CSIS SmartAssist! 👋

I'm your AI-powered campus assistant for the Computer Science & Information Systems department at BITS Pilani Goa Campus.

## What I Can Help You With:

🎓 **Academic Queries**
- TA applications and responsibilities
- Course information
- Exam schedules
- Academic policies

📋 **Administrative Tasks**
- Bill reimbursement procedures
- Form submissions
- Department workflows

🏫 **Lab & Room Booking**
- Check availability
- Submit booking requests
- Track your bookings

📖 **Information**
- Department policies
- Contact information
- Campus guidelines

💬 **How to Ask**:
- "How do I book a lab?"
- "What's the TA application process?"
- "Tell me about reimbursement"
- "Check lab availability"

Try clicking one of the quick action buttons below or type your question!`,
  },
};

function findBestResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Check each knowledge category
  for (const [_, category] of Object.entries(campusKnowledge)) {
    for (const keyword of category.keywords) {
      if (lowerMessage.includes(keyword)) {
        return category.response;
      }
    }
  }
  
  // Default response
  return campusKnowledge.general.response;
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    
    if (!messages || !Array.isArray(messages)) {
      throw new Error("Invalid request: messages array required");
    }

    // Get the latest user message
    const userMessages = messages.filter((m: any) => m.role === "user");
    const latestMessage = userMessages[userMessages.length - 1]?.content || "";
    
    if (!latestMessage) {
      throw new Error("No user message found");
    }

    // Find the best matching response
    const response = findBestResponse(latestMessage);
    
    // Create a streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send response in chunks to simulate streaming
          const chunks = response.split(" ");
          
          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i] + (i < chunks.length - 1 ? " " : "");
            const sseData = `data: ${JSON.stringify({
              choices: [{
                delta: { content: chunk },
                index: 0,
                finish_reason: i === chunks.length - 1 ? "stop" : null
              }]
            })}\n\n`;
            
            controller.enqueue(encoder.encode(sseData));
            
            // Small delay to simulate natural streaming
            await new Promise(resolve => setTimeout(resolve, 20));
          }
          
          // Send done signal
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat function error:", error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
