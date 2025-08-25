# Architecture — Troutman Handyman AI

This document explains the system architecture, major components, data model, and integrations for Phase 1.

## Overview

A Next.js (App Router) application with:

- Client UI for customer intake chat (text + images)
- Server-side AI orchestration to ask clarifying questions and produce structured summaries
- Booking integration via Cal.com, connected to a dedicated Google Calendar
- Owner Console to review conversations, summaries, and bookings
- Postgres for durable storage; S3-compatible storage for images

## Frontend

- Next.js App Router with React Server Components
- Chat interface supports:
  - Text input
  - Image upload (client -> signed URL -> S3 or direct API handler)
  - Streaming AI responses (Server-Sent Events)
- Admin console:
  - Conversation list/detail
  - Estimate summary versions
  - Booking overview
- Styling with SCSS Modules and a minimal component system; optional Radix primitives if needed

## Backend

- Next.js route handlers under app/api/\*
- AI orchestration using OpenAI Node SDK (GPT-5) with tool/function calling (adapter-friendly):
  - Tools:
    - propose_questions(conversation) -> clarifying questions
    - draft_summary(conversation, answers, images) -> structured summary JSON
    - price_materials(materials) -> priced list when retailer data available
- Runtime validation at API boundaries (JSON Schema/Yup/Valibot) in JS
- Prisma as ORM targeting Neon Postgres; repository pattern in lib/db for read/write operations
- Upload flow: generate signed URL or handle multipart, virus/type check, then persist Asset record

## Data Model (suggested)

Note: Exact fields may evolve; below is a starting point.

- User

  - id (uuid)
  - role ("owner" | "customer")
  - name, email (owner only required)
  - createdAt, updatedAt

- Conversation

  - id (uuid)
  - customerId (fk -> User or anonymous session token)
  - status ("active" | "completed" | "booked")
  - createdAt, updatedAt

- Message

  - id (uuid)
  - conversationId (fk)
  - sender ("customer" | "assistant")
  - type ("text" | "image")
  - text (nullable)
  - assetId (nullable, fk -> Asset)
  - createdAt

- Asset

  - id (uuid)
  - url (string)
  - mimeType (string)
  - sizeBytes (int)
  - createdAt

- EstimateSummary

  - id (uuid)
  - conversationId (fk)
  - version (int)
  - scope (text/json)
  - timeEstimateMinHours (float)
  - timeEstimateMaxHours (float)
  - materials (json) // [{ name, qty, unit, notes, unitPrice?, source? }]
  - priceRangeMin (int cents)
  - priceRangeMax (int cents)
  - risks (text/json)
  - assumptions (text/json)
  - disclaimer (text)
  - createdAt

- Booking

  - id (uuid)
  - conversationId (fk)
  - calcomBookingId (string)
  - googleEventId (string | null)
  - start (timestamp)
  - end (timestamp)
  - status ("pending" | "confirmed" | "cancelled")
  - createdAt, updatedAt

- WebhookEvent
  - id (uuid)
  - source ("calcom" | "stripe")
  - eventType (string)
  - payload (json)
  - processedAt (timestamp | null)
  - createdAt

## AI Flow (Phase 1)

1. Customer starts a conversation and uploads a description/images
2. Server sends AI prompt with conversation context
3. AI returns either:
   - Clarifying questions (assistant -> user)
   - Or a draft summary when enough info exists
4. Summary includes time, materials, price range, risks, and assumptions
5. Customer can iterate with more info; new summary versions are saved

## Booking Flow

- Use Cal.com embedded widget for the dedicated Handyman Calendar
- On booking creation/update/cancellation, Cal.com webhook hits app/api/webhooks/calcom
- Map the booking to the conversation and persist Booking
- Surface booking details in owner console

## External Integrations

- OpenAI (or equivalent) via Vercel AI SDK
- Cal.com (embed + webhook secret validation)
- Google Calendar via Cal.com connection (reduce direct API complexity)
- Retail pricing (Home Depot/Lowe’s): best-effort fetchers behind feature flag; fallback to defaults
- Stripe (optional): deposits/card holds; webhook processing to reconcile payment state

## Security & Privacy

- Minimal PII: collect only what’s necessary to schedule and communicate
- Access control: owner console behind NextAuth; conversations readable by owner only
- Upload validation: file type/size limits, basic malware scanning (via provider or library)
- Secrets in environment variables, never in repo
- Log redaction for PII

## Observability

- Request logging for API routes
- Basic metrics on conversation counts, summary versions, booking conversions
- Later: Sentry for error tracking, structured logs to Logtail or similar

## Deployment

- Target Vercel or similar for hosting Next.js
- Managed Postgres (Neon preferred; Supabase/Railway optional)
- S3-compatible storage (R2/S3/Supabase)
- Configure Cal.com webhooks to deployed URL

## Open Questions / Future Considerations

- Pricing data reliability and API access for retailers
- Owner-defined pricing presets per task type
- Multi-tenant? (Out of scope for now)
- SMS/WhatsApp/Messenger entry points (Phase 2)
