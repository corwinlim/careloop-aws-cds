# CareLoop Build 06 — Vercel static assets parity

**Verified:** original MVP v2 assets were copied byte-for-byte into project root `public/index.html` and `public/app.jsx`. GitHub Actions enforces `cmp` parity with `client/public/` on each PR/push. This is required because Vercel Express does not serve `express.static()` assets and expects `public/` at the project root.

Official reference: https://vercel.com/docs/frameworks/backend/express

## GitHub CI

Run https://github.com/corwinlim/careloop-aws-cds/actions/runs/40931752925 : completed **success** including source parity, npm install, npm test and syntax check.

## Vercel deployment — NOT VERIFIED

Vercel Git commit status for `17aadef747e66ebe5d3b72a52277692e68e4b465` remains **failure**. Current ChatGPT Vercel grant cannot access team `corwin-lims-projects` (403), so root cause is unknown.

Open https://vercel.com/corwin-lims-projects/careloop-aws-cds/GvNb6waAh95nnzdBbbA8zVNKP2ex and inspect first failing **Build Logs** line.

Confirm Git repo `corwinlim/careloop-aws-cds`, root directory **integrations/careloop-mvp-v2**, preview branch `build/careloop-mvp-v2-aws-ses-vercel`, Express framework and Node.js 22. Do not configure a custom output directory.

## Release checks
- GET / shows MVP v2 page; GET /app.jsx succeeds; GET /api/health returns version 2.0.0.
- Three merchant views, whitelist rejection, approval/rejection, mock outbox and audit must be browser-validated.
- In-memory data is not durable across Vercel instances; production parity is not proved.
- Amazon SES is **NOT** live-send verified. Keep SES_LIVE_ENABLED=false and no operator token in public preview. Verified recipient, IAM and actual MessageId + inbox proof are pending.

**Do not merge into main or declare live AWS SES acceptance.**
