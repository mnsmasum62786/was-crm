# WAS CRM

Self-hosted CRM + marketing automation for **Web Analytics Solution (WAS)** — a Bangladesh-based web-analytics training business. Manages leads, sales, follow-up, and email + WhatsApp + SMS automation across a 3-tier funnel.

## Tech stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript |
| UI | Tailwind CSS + shadcn-style components |
| DB | PostgreSQL (Supabase) |
| ORM | Prisma |
| Background jobs | Inngest (durable delays + retries) — with a Vercel-Cron fallback |
| Email | Resend (behind `EmailProvider`) |
| WhatsApp | WhatsApp Cloud API / Meta (behind `WhatsAppProvider`) |
| SMS | BD gateway (behind `SmsProvider`) |
| Auth | NextAuth (credentials) + role-based access |
| Validation | Zod on all API inputs |

### Provider mocking
All three channels sit behind interfaces (`EmailProvider`, `WhatsAppProvider`, `SmsProvider`). Each has a real implementation **and** a Mock that logs to the DB. When a provider's env keys are missing it **falls back to Mock automatically**, so the whole system is buildable and testable without live API keys. Inngest likewise falls back to inline processing + a cron tick when not configured.

## Business model

| Tier | Price (BDT) | Notes |
| --- | --- | --- |
| Workshop | 499 | "Web Analytics Launchpad" — 3-day live workshop, batches every 2 weeks |
| Base Membership | 5999 | 1 year (renewal 4999) |
| VIP Membership | 12999 | Lifetime |

**Funnel stages:** `Lead → Workshop Registered → Workshop Attended → Base Member → VIP Member → Renewed → Churned`
**Segments:** `beginner | ad_expert | web_dev`
**Identity:** phone number, normalized to E.164 (`+8801XXXXXXXXX`).

## Hard constraints (all enforced in code)

1. **Phone is primary identity** — normalized to E.164 and deduped on every ingest (`src/lib/contacts.ts`).
2. **Webhook idempotency** — every ingest/payment/webhook uses an idempotency key (`src/lib/idempotency.ts`).
3. **WhatsApp 24h window** — free-form only inside 24h of last inbound; templates only outside (`src/lib/whatsapp-window.ts`, enforced in `src/lib/messaging.ts`).
4. **Consent + opt-out** — checked before every marketing send; STOP/unsubscribe honored instantly across all sequences (`src/lib/consent-gate.ts`, `src/lib/consent.ts`).
5. **Sequence exit conditions** — a contact who converts instantly exits "not converted" sequences (`src/lib/sequence-exit.ts`, `src/lib/sequences.ts`).
6. **Attribution capture** — utm_*, fbclid, fbp, fbc, referrer stored on contact + first touch (`src/lib/attribution.ts`).
7. **Audit log** — every money/stage change is recorded (`src/lib/audit.ts`).

## Architecture

```
src/
  app/
    (app)/            Authenticated admin UI (dashboard, contacts, pipeline, sequences, …)
    api/
      ingest/         lead | payment | manychat  (Zod-validated, deduped, idempotent)
      webhooks/       whatsapp (verify + inbound + status + STOP)
      cron/           sequences (tick) | renewals (daily scan)  — Vercel Cron
      inngest/        Inngest serve endpoint
      auth/           NextAuth
      unsubscribe/    one-click opt-out
  lib/
    contacts.ts       dedupe/upsert-by-phone, stage moves
    deals.ts          payment → deal/membership/stage/exit/onboarding
    messaging.ts      unified send pipeline (consent + 24h window + Message log)
    sequences.ts      enroll / exit enforcement / step engine
    providers/        email | whatsapp | sms  (real + Mock)
    metrics.ts        funnel / revenue / channel health / team
    inngest/          client, functions, trigger helper
  components/         UI primitives + app shell
prisma/
  schema.prisma       full data model
  seed.ts             founder user, 24 templates, 8 sequences, demo batch
tests/                vitest unit tests for the 6 hard constraints
```

### Sequence engine
Enrollments carry `currentStep` + `nextRunAt`. The engine (`advanceEnrollment`) executes steps until it hits a delay, an exit, or completion. Durable delays are driven by **Inngest** when configured, otherwise by the **`/api/cron/sequences`** Vercel Cron tick (every minute) — exit conditions are re-checked before every step so conversions/opt-outs exit immediately.

### Seeded sequences
1. Workshop Reminder · 2. Workshop Follow-up (sales, exits on Base purchase) · 3. Registered-Not-Paid · 4. Base Onboarding · 5. VIP Upsell · 6. Renewal (30/15/7d + at-risk task) · 7. Cold Re-engagement · 8. Win-back.

## Local setup

```bash
npm install --legacy-peer-deps
cp .env.example .env          # fill in DATABASE_URL / DIRECT_URL etc.
npm run db:push               # sync schema to Postgres
npm run db:seed               # founder user + templates + sequences
npm run dev                   # http://localhost:3000
```

Sign in with `FOUNDER_EMAIL` / `FOUNDER_PASSWORD` from your `.env`.

### Scripts
- `npm run build` · `npm run typecheck` · `npm run lint`
- `npm test` — vitest unit tests
- `npm run db:push | db:seed | db:studio`

## Testing the ingestion API

```bash
# Lead
curl -X POST http://localhost:3000/api/ingest/lead -H 'Content-Type: application/json' \
  -d '{"phone":"01712345678","name":"Demo","source":"workshop_registration","utm_source":"facebook","utm_medium":"cpc"}'

# Payment (idempotent on transactionId)
curl -X POST http://localhost:3000/api/ingest/payment -H 'Content-Type: application/json' \
  -d '{"phone":"01712345678","tier":"base","amount":5999,"status":"paid","transactionId":"TXN-1"}'
```

## Environment variables
See [`.env.example`](.env.example). Missing provider keys → that channel uses the Mock provider; missing Inngest keys → inline + cron processing.

## Deployment (Vercel)
- Set the env vars from `.env.example` in the Vercel project.
- `vercel.json` registers the two cron jobs (sequence tick + daily renewal scan).
- Prisma uses the Supabase **pooled** `DATABASE_URL` (port 6543) at runtime and the **direct** `DIRECT_URL` (port 5432) for migrations.
