# CareLoop Hackathon MVP v2

Follow-up care platform for pet businesses — approval-gated, whitelist-secured, fully audited, non-diagnostic.

## What's New in v2

- 🏨 **Primary demo: Boarding / Groomer** (Paw Seasons Pet Hotel & Spa) — 3 demo journeys
- 🏥 **Vet / Clinic** (Riverton Veterinary Clinic) — 2 example journeys
- 🛒 **Pet Store / Pet Food Merchant** (PawPrima Pet Nutrition) — 2 example journeys
- 🚪 **Login page** with 4 entry points (Demo Login + 3 merchant types)
- 🔴 **P0 Fix: Whitelist** — backend-enforced dual check (intake + send time), seed data populated
- 🟠 **P1 Fix: Approval** — Approve/Reject fully functional, end-to-end approve→send flow works
- 🟠 **P1 Fix: Mock Outbox** — data consistency, Dashboard count = Outbox count
- 🔒 Append-only audit log — no update/delete API paths

## Quick Start

```bash
# Install dependencies
npm install

# Run tests (23 tests, all passing)
npm test

# Seed data and start server
npm run seed   # optional - server auto-seeds on start
npm start

# Open in browser
# http://localhost:3000
```

The app auto-seeds demo data on startup. No database needed — data is in-memory (swap for PostgreSQL in production).

## Project Structure

```
careloop-mvp-v2/
├── server/
│   ├── index.js          # Express server + REST API
│   ├── data.js           # Data layer + business logic (whitelist, approval, audit)
│   └── seed.js           # Demo data seeding for all 3 merchant types
├── client/
│   └── public/
│       ├── index.html    # SPA entry point
│       └── app.jsx       # React app (single file, Babel in browser)
├── tests/
│   └── run-tests.js      # 23 automated tests
├── package.json
└── README.md
```

## Multi-Merchant Types

The platform supports 3 merchant types with isolated data:

| Type | Demo Business | Primary Scenario |
|------|--------------|------------------|
| `boarding_groomer` | Paw Seasons Pet Hotel & Spa | ✅ **Main demo** — 3 full journeys |
| `vet_clinic` | Riverton Veterinary Clinic | 2 example journeys |
| `pet_store` | PawPrima Pet Nutrition | 2 example journeys |

Data is completely isolated — each merchant type has its own whitelist, care contexts, messages, and audit log.

## Boarding/Groomer Demo Script (Primary)

### 1. Main Path: Approve → Send → Response (Bella)
- **Pet:** Bella, Golden Retriever
- **Scenario:** Post-grooming skin sensitivity check-in
- **Flow:** Draft → Approve → Send → Owner responds ("still an issue") → Concerning detected → Timeline
- **Demonstrates:** Full approval workflow, response sentiment analysis, audit trail

### 2. Negative Demo: Rejection (Moose)
- **Pet:** Moose, English Bulldog
- **Scenario:** Post-boarding follow-up — owner opted out
- **Flow:** Draft → Submit → **Reject** (reason: owner opted out) → Audit log
- **Demonstrates:** Approval rejection, rejection reasons captured in audit

### 3. Danger Signal: Escalation Path (Luna)
- **Pet:** Luna, Siamese Cat
- **Scenario:** Post-boarding ear scratching observed
- **Flow:** High-risk context → Red banner → "Contact Veterinarian" CTA
- **Demonstrates:** Risk flagging, danger signals, non-diagnostic escalation

## Security Model (Three Gates)

### 1. Whitelist (Dual Check)
- **Intake check:** Creating a care context with a non-whitelisted email → **blocked** (403)
- **Send-time check:** Email removed from whitelist after intake → send **blocked** at send time
- Both checks are enforced in the backend service layer (`server/data.js`)
- All blocks write audit entries: `care_context.whitelist_blocked` / `follow_up.whitelist_blocked`

### 2. Approval Gate
- Messages must be in `approved` state before sending
- Backend validates: not approved → **blocked** (403), audit entry written
- Approval has its own audit trail with `approval_id`, `approved_by`, `approved_at`

### 3. Append-Only Audit
- Every state change writes to the audit log
- **No update or delete functions exist** for audit entries (verified in `data.js` exports)
- No API endpoints for modifying audit entries
- Audit entries include: event type, entity, actor, timestamp, metadata (from_state, to_state, reason)

## API Endpoints

### Dashboard
- `GET /api/dashboard/stats` — key metrics

### Care Contexts
- `GET /api/care-contexts` — list all
- `GET /api/care-contexts/:id` — detail + messages + timeline
- `POST /api/care-contexts` — create (whitelist-checked)

### Messages
- `GET /api/messages?status=pending_approval` — filter by status
- `GET /api/messages/:id` — detail + timeline + responses
- `POST /api/messages/:id/submit` — submit for approval
- `POST /api/messages/:id/approve` — approve
- `POST /api/messages/:id/reject` — reject with reason
- `POST /api/messages/:id/send` — send (approval-gated + whitelist-checked)

### Whitelist
- `GET /api/whitelist` — list entries
- `POST /api/whitelist` — add entry
- `POST /api/whitelist/:id/disable` — disable entry
- `GET /api/whitelist/check/:email` — check status

### Mock Outbox
- `GET /api/mock-outbox` — all sent mock emails

### Audit
- `GET /api/audit?limit=50` — audit log
- `GET /api/audit/integrity` — append-only verification
- `GET /api/care-contexts/:id/timeline` — timeline for a context

### Testing
- `GET /api/test/whitelist-blocked` — negative test: tries to create context with non-whitelisted email
- `POST /api/admin/seed` — reset and re-seed all data

## Non-Diagnostic Commitment

All follow-up messages are:
- Supportive, not diagnostic
- Include clear disclaimer: "This is a supportive follow-up... It is not a diagnosis and does not replace a veterinary examination."
- Danger signals clearly direct owners to contact a veterinarian
- No medication dosing recommendations beyond restating prescriptions

## Tests

23 automated tests covering:
- Whitelist management (6 tests)
- Whitelist blocking at intake (3 tests) — P0
- Approval gate (3 tests) — P1
- Whitelist blocking at send time (2 tests) — P0
- Append-only audit (3 tests)
- Mock outbox consistency (2 tests) — P1
- Multi-merchant isolation (2 tests)
- Response handling (2 tests)

Run with: `npm test`

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |

## Deploying to Production

To move from MVP to production:
1. Replace in-memory data store with PostgreSQL + Prisma
2. Add real authentication (Clerk, Auth0, etc.)
3. Replace Mock SES with real AWS SES
4. Add rate limiting, input validation middleware
5. Add RBAC for staff/manager/admin roles

## GitHub Push

```bash
git init
git add .
git commit -m "CareLoop MVP v2 - Hackathon submission"
git branch -M main
git remote add origin <your-repo-url>
git push -u origin main
```

## Tech Stack

- **Backend:** Node.js + Express
- **Frontend:** React 18 + Tailwind CSS (Babel standalone for MVP)
- **Data:** In-memory (PostgreSQL-ready architecture)
- **Tests:** Pure Node.js assertions, no test framework dependency

---

*Built for the CareLoop Hackathon MVP v2 submission*

## Build 03 — Amazon SESv2 adapter (staging-only)

Original MVP v2 UI, API, seed records and **Mock Outbox remain unchanged**. A separate operator-only endpoint supports an explicit **synthetic real SES test**; it does not silently convert demo approvals into real sends. Live recipient identities are controlled server-side.

`POST /api/internal/ses/send-test` requires:

- `CARELOOP_OPERATOR_TOKEN` (server secret, 32+ characters; send in `x-careloop-operator-token` header; never expose to browsers or commit).
- `SES_LIVE_ENABLED=true` (otherwise disabled by default).
- `SES_FROM_EMAIL` (verified SES identity).
- `SES_TEST_RECIPIENTS` (comma-separated, explicitly verified recipients only).
- AWS credentials via IAM role / identity federation, and `AWS_REGION=ap-southeast-2`.
- JSON `{ "to": "verified-recipient@example.com", "subject": "Synthetic care follow-up test", "body": "SYNTHETIC TEST ONLY", "confirmation": "SEND_SYNTHETIC_TEST_EMAIL" }`.

The endpoint invokes `SESv2Client.send(new SendEmailCommand(...))`, returns redacted `MessageId` if SES **accepts** the call. Acceptance is not delivery; check SES events / recipient inbox independently. API errors are redacted. **This endpoint is a diagnostic, not a production multi-tenant sender**: operator tokens are not a replacement for OIDC/RBAC, transactional outbox, and customer consent. Public demo `x-merchant-type` headers are untrusted. Do not enable real sending on a publicly accessible deployment; use trusted private staging, and leave `SES_LIVE_ENABLED` unset in Vercel demo.

Run: `npm install && npm test`. New provider tests use a fake SES client and never send network requests.

### Vercel parity caveat

The current v2 Express service stores state in process memory. A Vercel serverless deployment will not provide durable/shared state; no guarantee that approval/outbox/audit workflows stay consistent between requests or instances. **Vercel Production: NO-GO until the store is migrated to a durable database and the application passes browser/API parity tests.** The hosted web UI may be deployed as a read-only preview, but the full functional MVP requires a persistent backend.
