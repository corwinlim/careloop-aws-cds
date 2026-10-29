# Build 05 — Vercel failure investigation and release gate (2026-10-30)

## Verified evidence
- Full MVP v2 frontend/backend source is present in the `build/careloop-mvp-v2-aws-ses-vercel` branch.
- GitHub Actions integration gate: [run 40898533963](https://github.com/corwinlim/careloop-aws-cds/actions/runs/40898533963), `test` job SUCCESS (required files, npm install, npm test, syntax check).
- Combined commit status for `b79aff36182249c86014876efedbe4589d98413f`: **Vercel failure**. [Open failing deployment](https://vercel.com/corwin-lims-projects/careloop-aws-cds/G4XUB3CHTAEHXkdZ3p49SHC6LU3Q).
- Current Vercel chat connection has no access to `corwin-lims-projects` (403 scope unauthorized). Build logs were NOT retrieved. Do not infer exact failure cause.
- AWS SES SendEmail live acceptance/inbox delivery NOT verified.

## Inspect the existing Vercel project (owner action)
1. Open the existing project under the **corwin-lims-projects** scope, not the separate `freshcanibowl-8248s-projects` scope.
2. In **Settings → Git**, confirm connected repository `corwinlim/careloop-aws-cds`, branch and source commit. Avoid deploying old `main` as if it contained MVP v2.
3. In **Settings → Build and Deployment**, set **Root Directory** to `integrations/careloop-mvp-v2`, confirm Express/Node.js and select Node 22.
4. Inspect **Deployments → failed deployment → Build Logs** for the precise error. Copy the first failing command/error message, with secrets redacted. Do NOT publish secret values.
5. Create a fresh **Preview** from the integration branch only. Verify the commit SHA displayed matches that branch and that `/api/health` plus the real UI load.
6. Do **not** enable `SES_LIVE_ENABLED` on a public demo/preview; leave `CARELOOP_OPERATOR_TOKEN` unset in public environments.
7. Validate Boarding/Groomer, Vet, Pet Store, approvals, allowlist rejection, mock outbox and audit with a browser. The demo remains NO-GO for production parity because in-memory stores are instance-local on Vercel.
8. For real SES sandbox testing, use a restricted private staging environment only, sender and recipient identities verified, a least-privilege AWS role, an allowlist and explicit operator approval. Capture SES MessageId and independently verify inbox delivery.

## Important
An Express entry file exists at `app.js`, which exports the app; it does not solve in-memory state durability. A successful GitHub CI test does not imply Vercel deployment success. A provider MessageId is NOT inbox delivery.

Release: **NO-GO** pending Vercel logs, browser parity and SES live evidence.
