# Roadmap — Troutman Handyman AI

This roadmap outlines milestones for Phase 1 and Phase 2, with a focus on shipping a valuable MVP quickly and iterating.

## Phase 1 — MVP (Weeks 1–4)

Goal: Intake chat with AI summaries, booking via Cal.com, and owner console visibility.

1. Foundations

   - Initialize Next.js app (App Router, JavaScript, SCSS Modules)
   - Configure linting/formatting, basic CI
   - Set up Prisma + Postgres (Neon); define initial schema; migration pipeline
   - Env var management; .env.example

2. Customer Intake

   - Chat UI (text input, image upload)
   - Image storage (S3-compatible) + signed URLs
   - Streaming AI responses via OpenAI Node SDK (GPT-5); tool/function calling with runtime validation
   - Persist conversations/messages/assets

3. AI Summaries

   - Prompt strategy for clarifying questions and draft summaries
   - Structured JSON output (scope, time, materials, price range, risks, assumptions, disclaimer)
   - Materials pricing fetchers (feature-flagged; fallback ranges)
   - Versioned EstimateSummary records

4. Booking Flow

   - Cal.com embed tied to dedicated Handyman Calendar
   - Webhook endpoint to persist bookings and update status
   - Link bookings to conversations; show booking info to customer and owner

5. Owner Console

   - Auth for owner (NextAuth)
   - Conversation list/detail, message viewer
   - Summary history and booking status

6. Polish & Compliance
   - Disclaimers and transparent range display
   - File validation and size limits
   - Basic analytics and logging
   - Deploy to preview/prod; configure webhooks

Deliverable: Working MVP that handles intake, produces draft estimates, and books time.

## Phase 2 — Channels, Pricing, and Ops (Weeks 5–8)

Goal: Expand acquisition channels and operational tooling.

1. New Entry Points

   - Messenger/WhatsApp/SMS intake via Twilio/Meta APIs
   - Link external channel sessions to Conversations

2. Pricing & Catalog

   - Owner-defined pricing presets/templates
   - Inventory/materials catalog with price syncing
   - Improved materials pricing adapters (Home Depot/Lowe’s)

3. Payments

   - Stripe deposits or holds for bookings
   - Owner-configurable fees and tax

4. Ops & QA
   - Sentry, structured logging, dashboards
   - E2E tests (Playwright) for core flows
   - Back-office exports (CSV of summaries/bookings)

## Phase 3 — Marketplace & Growth (Weeks 9+)

- Multi-crew scheduling, capacity management
- Referral/affiliate flows; lead sources attribution
- Customer portal with history and repeat bookings
- Quoting-to-invoice flow with Stripe or QuickBooks integration

## Risks & Mitigations

- AI hallucinations: constrain with schemas, show confidence and ranges, owner review
- Pricing API volatility: cache, fallback, and transparency
- Image handling/security: type limits, size caps, scanning; signed URLs
- Calendar conflicts: rely on Cal.com + Google Calendar sync, add webhook retries

## Success Metrics (initial)

- Completion rate of intake (text+images)
- % conversations with a generated summary
- Booking conversion rate from summary
- Owner console usage (review rate, time to decision)

## Immediate Next Steps (for repo)

- Approve documentation
- Scaffold Next.js app with initial folder structure (.js/.jsx, SCSS)
- Add Prisma schema and run first migration (Neon DB)
- Implement chat API route with stub AI orchestration and runtime validation
- Wire Cal.com embed and webhook handler (mock locally)
