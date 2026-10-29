# CareLoop MVP v2 — Vercel Preview and AWS SES Ship Gates

## Repository parity

- Source directory `integrations/careloop-mvp-v2/` must contain the entire supplied ZIP, not just an SES adapter.
- Deploy exactly this subdirectory as the Vercel **Root Directory**.
- Entry point `app.js` exports the original Express `app` after seeding demo records on cold start.
- The original `client/public/index.html` and `app.jsx` are preserved byte-for-byte.
- Browser routes must show all original screens: Boarding/Groomer, Vet/Clinic, Pet Store, Whitelist, Approval Queue, Mock Outbox, Audit.

## ⚠ Serverless state caveat

Approval, outbox and audit use in-process `Map`/array state. A Vercel Serverless Function may start different instances on each request, so it cannot offer session-to-session state parity with the original Express server. **Production remains NO-GO.** Choose a durable transactional store (Postgres or DynamoDB) and migrate all reads/writes, including audit/replay and idempotency, before claiming functional parity.

## Secure SES staging

- Public preview/demo: no `SES_LIVE_ENABLED=true`, no real sends.
- Private test environment: `SES_LIVE_ENABLED=true`, sender and recipient both verified in AWS SES Sandbox, `SES_TEST_RECIPIENTS` explicit, `CARELOOP_OPERATOR_TOKEN` 32+ characters, IAM least privilege.
- Do not use browser demo identity (`x-merchant-type`) for real send authorization; operator-only endpoint is diagnostic, not customer workflow.
- SES API acceptance MessageId ≠ inbox delivery. Correlate CloudWatch/SES event publishing and inspect test inbox.
- Reject release if IAM still reports `AccessDeniedException` or if no real `MessageId` is returned.

## Deployment recipe once Vercel permissions are fixed

1. Vercel → New Project → Import `corwinlim/careloop-aws-cds`.
2. Set **Root Directory** to `integrations/careloop-mvp-v2` on the branch containing the imported source.
3. Choose Express/Node.js, runtime Node 22, region `syd1` or `sin1` after review.
4. Keep SES live disabled in Preview; do not add AWS keys to client assets.
5. Build Preview, check actual deployment SHA and HTTP /api/health.
6. Test UI parity in a real browser across every merchant and API workflow. Because of memory state, expect failures under multiple instances until durable storage is implemented.
7. Only after persisted-state tests pass, consider a production release.

## Current evidence at package creation

Original 23 tests PASS. Four new SES adapter tests PASS using a fake SDK client. No AWS SES live MessageId, actual delivered inbox, Vercel deployment URL, or GitHub CI receipt verified. Any claims of real delivery or deployed production parity would be premature.
