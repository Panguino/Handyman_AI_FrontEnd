# Environment Configuration

This guide explains the environment variables required for Troutman Handyman AI (Next.js + Neon Postgres + OpenAI GPT-5 + S3 + Google Calendar, optional Stripe).

Create a .env.local in the project root based on .env.example. Never commit secrets.

## App and Auth

- NODE_ENV: development | production
- VERCEL_URL: Base URL for NextAuth callbacks, e.g., http://localhost:3000 in dev
- NEXTAUTH_SECRET: Long, random string (openssl rand -base64 32)

## Database (Neon + Prisma)

- DATABASE_URL: Neon connection string (pooled). Single URL is sufficient for app and migrations.
  - Example pattern (do not commit real secrets):
    postgresql://neondb_owner:YOUR_PASSWORD@ep-your-neon-host-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require

Notes:

- Ensure sslmode=require (and channel_binding=require for Neon pooled hosts)
- For local development with Docker Postgres, set DATABASE_URL to your local instance

## OpenAI (GPT-5)

- OPENAI_API_KEY: Your OpenAI API key
- OPENAI_MODEL: Default model name (e.g., gpt-5)

Recommended:

- Keep prompts short; rely on function/tool calling to output strict JSON summaries
- Use streaming for fast UI feedback

## Object Storage (S3-compatible)

- S3_REGION: e.g., us-east-1
- S3_ENDPOINT: Leave empty for AWS S3; set for R2/Supabase
- S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY: Programmatic credentials
- S3_BUCKET: Bucket name
- S3_FORCE_PATH_STYLE: Some providers require path-style URLs (true/false)
- NEXT_PUBLIC_S3_PUBLIC_BASE_URL: Optional CDN/public base for serving assets

Notes:

- Prefer signed PUT URLs for client uploads; validate type/size on server
- Consider small image resizing/compression before upload

## Scheduling (Google Calendar)

Choose one of the following approaches:

Option A — OAuth via NextAuth (simple for single-owner calendars)

- GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: OAuth credentials from Google Cloud Console
- GOOGLE_CALENDAR_ID: The calendar to create events on (you@gmail.com or a specific calendar ID)
- Request calendar scopes in the OAuth consent (e.g., https://www.googleapis.com/auth/calendar.events)
- On first owner login, capture and persist the refresh token (NextAuth can manage tokens; we’ll store what we need server-side)

Option B — Service Account (server-to-server)

- GOOGLE_SERVICE_ACCOUNT_EMAIL: Service account email
- GOOGLE_SERVICE_ACCOUNT_KEY: Private key (PEM) or base64-encoded JSON key
- GOOGLE_CALENDAR_ID: Share this calendar with the service account (Make changes to events)

Notes:

- Enable the Google Calendar API in Google Cloud Console
- Either method works; service accounts are robust for server-side automation if you can share the calendar with the service account

## Payments (optional — Stripe)

- STRIPE_SECRET_KEY: Server-side API key
- STRIPE_WEBHOOK_SECRET: For webhook signature verification

Webhook setup:

- Point Stripe webhooks to /api/webhooks/stripe
- Verify signatures with STRIPE_WEBHOOK_SECRET

## App Limits/Configs

- MAX_UPLOAD_MB: Maximum upload size per asset (MB)

## Public vs Server-only variables

- NEXT*PUBLIC*\* variables are exposed to the browser
- All other variables are server-only and must not be referenced in client components

## Getting credentials

- Neon: Create a project and database; copy your pooled connection string
- OpenAI: Create an API key from https://platform.openai.com/
- S3: Create a bucket and programmatic user; copy keys and region/endpoint
- Google Calendar: Create OAuth credentials or a service account; enable Calendar API; get calendar ID
- Stripe: Create test keys and webhook signing secret (optional)
