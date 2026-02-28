# CSIS SmartAssist - Campus Smart Guide

An AI-powered campus assistant for the CSIS (Computer Science & Information Systems) department at BITS Pilani Goa Campus. Features RAG-based intelligent responses, lab booking, and comprehensive campus knowledge base.

## Features

- **AI-Powered Chat**: RAG-enabled chatbot with campus-specific knowledge
- **Authentication**: Google OAuth + Email/Password with email verification
- **Lab Booking**: Book labs, seminar halls, and conference rooms
- **Knowledge Base**: Access academic policies, procedures, and FAQs
- **Request Tracking**: Track your booking requests and approvals

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions)
- **AI**: RAG pipeline with vector embeddings for campus-relevant responses

## Setup Instructions

### 1. Clone and Install

```sh
git clone <YOUR_GIT_URL>
cd campus-smart-guide
npm install
```

### 2. Supabase Configuration

1. Create a new Supabase project (or use existing: `enletqtyfweieokfpmzp`)
2. Copy `.env.example` to `.env` and fill in your credentials:
   ```
   VITE_SUPABASE_PROJECT_ID="your-project-id"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
   VITE_SUPABASE_URL="https://your-project-id.supabase.co"
   ```

### 3. Database Setup

Run the migrations in your Supabase SQL Editor:
1. First run `supabase/migrations/20260228132256_*.sql` (base tables)
2. Then run `supabase/migrations/20260228140000_auth_and_rag.sql` (auth + RAG)

### 4. Enable Authentication

**Google OAuth:**
1. Go to Supabase Dashboard → Authentication → Providers
2. Enable Google provider
3. Create OAuth credentials in Google Cloud Console
4. Add Client ID and Secret to Supabase
5. Set redirect URL: `https://your-project-id.supabase.co/auth/v1/callback`

**Email Verification:**
- Email verification is enabled by default in Supabase
- Customize templates in Authentication → Email Templates

### 5. Edge Functions (RAG)

Deploy the chat function:
```sh
supabase functions deploy chat
```

Set environment variables in Supabase Dashboard → Edge Functions:
- `LOVABLE_API_KEY` - Required for AI responses
- `OPENAI_API_KEY` - Optional, for vector embeddings (enhanced RAG)

### 6. Run Development Server

```sh
npm run dev
```

## Project Structure

```
src/
├── components/     # UI components
├── contexts/       # Auth context
├── hooks/          # Custom hooks
├── integrations/   # Supabase client
├── lib/            # Utilities
├── pages/          # Route pages
└── test/           # Tests

supabase/
├── functions/      # Edge functions (chat with RAG)
└── migrations/     # Database schema
```

## RAG Knowledge Base

The campus knowledge base is stored in `campus_documents` table with:
- Academic policies (TA applications, exams, registration)
- Administrative procedures (reimbursements, leave)
- Facilities info (lab bookings, library)
- FAQs and general information

Add more documents via Supabase Dashboard or Admin interface.

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
