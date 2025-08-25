# Troutman Handyman AI

A Next.js application that helps local customers describe handyman projects via chat (text + images), receives AI-assisted clarifying questions and structured draft estimates, and lets them book a time on a dedicated "Handyman Calendar." An owner console provides visibility into conversations, estimates, and bookings.

## Vision

Troutman Handyman AI streamlines the intake and estimate process:

- Customers describe the job with text and photos
- The AI asks clarifying questions and produces a transparent, structured estimate
- Customers can book directly on a dedicated calendar
- The owner can review transcripts, summaries, and bookings in a simple console

This is not a fixed quote generator; estimates must show ranges and assumptions. Materials are generic with pricing from common retailers (Home Depot / Lowe’s) when available.

## Phase 1 Scope

- Customer-facing intake chat (text + image uploads)
- AI-assisted intake that generates a structured summary:
  - Scope of work
  - Time estimate (min–max hours)
  - Materials list (generic; priced via Home Depot/Lowe’s if possible)
  - Price range (labor + materials + travel/trip fee)
  - Risks/unknowns and disclaimers
- Booking flow connected to a dedicated Google Calendar (via Cal.com or direct API)
- Owner Console to review conversations, estimates, and bookings
- Simple data model (customers, conversations, messages, summaries, bookings)
- Estimates are transparent: ranges, assumptions, and material variability

## Architecture at a Glance

- Next.js (App Router) for UI, API routes, streaming chat
- Postgres on Neon (via Prisma ORM) for durable data
- Object storage (S3-compatible) for uploaded images
- OpenAI Node SDK (GPT-5) for LLM streaming + tool/function calling to produce structured JSON summaries
- Cal.com embed + webhooks to manage bookings on a dedicated Google Calendar
- Optional Stripe for deposits or pre-authorization to secure bookings

See ARCHITECTURE.md for a deeper dive.

## Tech Stack

- Framework: Next.js (App Router, React Server Components)
- Language: JavaScript (no TypeScript)
- Styling: SCSS Modules
- Auth: NextAuth for owner/admin; lightweight customer session keyed to conversation
- Database: Postgres on Neon, Prisma ORM
- Storage: S3-compatible (AWS S3, Cloudflare R2, or Supabase Storage)
- AI: OpenAI GPT-5 via OpenAI Node SDK (Vercel AI SDK optional)
- Scheduling: Cal.com (embed + webhooks) mapped to a dedicated Google Calendar
- Payments (optional): Stripe
- Observability: Next.js middleware logging + basic request metrics; future: Sentry/Logtail

## Data Model (overview)

Core entities:

- User (role: owner | customer)
- Conversation (belongs to customer)
- Message (text/image; sender: customer | assistant)
- EstimateSummary (one or more versions per conversation)
- Booking (Cal.com + Google Calendar event linkage)
- Asset (uploaded images)
- WebhookEvent (Cal.com/Stripe receipts)

See ARCHITECTURE.md for suggested fields and relationships.

## External Integrations

- Cal.com: embedded scheduling widget + webhooks to persist bookings and sync status
- Google Calendar: connected account through Cal.com; direct API available if needed later
- OpenAI (or provider of choice): chat + vision reasoning, tool/function calling to produce structured summaries
- Retail pricing: Home Depot/Lowe’s public endpoints where feasible (fallback: static reference ranges)
- Stripe (optional): deposits, card holds, or invoicing

## Local Development (high level)

1. Clone repo and create .env.local (see Env Vars below)
2. Provision Neon Postgres (or local Docker) and run Prisma migrations
3. Configure S3-compatible storage (test bucket) for image uploads
4. Obtain API keys for OpenAI (GPT-5) and Cal.com (and Stripe if used)
5. Run dev server (Next.js)

Detailed commands and scripts will be added once we scaffold the app.

## Environment Variables (baseline)

- DATABASE_URL
- NEXTAUTH_SECRET (for owner auth)
- OPENAI_API_KEY
- S3_REGION, S3_ENDPOINT (if needed), S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET
- CALCOM_API_KEY, CALCOM_WEBHOOK_SECRET, CALCOM_EMBED_URL (or org/username slug)
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET (optional)

## Repository Structure (proposal)

```
/ (repo root)
  app/
    globals.scss               # Global styles (SCSS)
    (marketing)/               # Landing / basic marketing pages
    chat/                      # Customer intake chat UI (text + images)
    admin/                     # Owner console (protected)
    api/                       # Route handlers (JSON/streaming)
      chat/route.js            # Streaming chat endpoint (AI orchestration)
      upload/route.js          # Signed upload or direct handler
      bookings/route.js        # Booking creation/fetch
      webhooks/
        calcom/route.js        # Cal.com webhooks
        stripe/route.js        # Stripe webhooks (optional)
  components/                  # UI components (.jsx)
  lib/
    ai/                        # Model adapters, prompt builders, schemas
    auth/                      # NextAuth config, guards
    db/                        # Prisma client, repositories
    storage/                   # S3 utilities
    calendar/                  # Cal.com helpers, embeds, mapping
    pricing/                   # Estimation helpers, pricing adapters
    validators/                # Runtime schemas for inputs/outputs
  prisma/
    schema.prisma              # DB schema
    migrations/                # Generated by Prisma Migrate
  public/                      # Static assets
  scripts/                     # One-off scripts (seed, backfill)
  tests/                       # Unit/integration tests
  .github/workflows/           # CI
  README.md
  ARCHITECTURE.md
  ROADMAP.md
```

## Contributing

- Keep estimates transparent: show ranges, assumptions, and risks
- Prefer small, reviewable PRs
- Add/maintain typing and validation at the API boundaries (Zod)
- Include basic tests for API routes and utility logic

## License

TBD by project owner.
