# CareLoop MVP v2 × Amazon SES — Integration staging
This directory is an **isolated staging area**, not the full MVP v2 and not deployed. The full original Node.js/Express/React MVP v2 archive has not yet been committed to this branch. The `server/ses-provider.js` file contains the SESv2 bridge to use in that app.

## Source of truth
Full export: `CareLoop_MVP_v2_SES_Integration_Build03.zip` (user-provided archive rebuilt and tested in ChatGPT workspace). Upload/unzip its contents into this directory (maintaining `server/`, `client/public/`, `tests/`, `package.json`), then run npm install and npm test on a network-enabled runner. Do not merge this branch until the complete archive is present and reviewed.

## Mode distinction
- Public demo: original Mock Outbox (no actual sends).
- SES staging: `SES_LIVE_ENABLED=true` only with operator authorization (32+ character token), SES verified from identity, explicit SES_TEST_RECIPIENTS allowlist and valid AWS credentials. The complete archive adds `POST /api/internal/ses/send-test` and calls the real SESv2 SDK.
- `MessageId` from SES proves provider acceptance only, not inbox delivery.
- An end-to-end production flow also needs authenticated tenant identity, transactional durable database/outbox, and true owner consent.

## Vercel release gates
1. Commit the exact v2 UI and API source from the archive to this branch and compare build output.
2. Run 23 original tests + SES provider tests in CI; browser E2E using a real preview.
3. Replace in-memory stores: Vercel functions cannot guarantee shared/persistent state across instances.
4. Set AWS credentials via keyless IAM/OIDC or least-privileged credentials, NEVER in repo or client bundle.
5. Keep SES_LIVE_ENABLED=false on public demo. Enable only in a restricted staging environment after authorization review.
6. Verify sender/recipient identities, IAM permissions, AWS SES MessageId and actual inbox/CloudWatch evidence. Prior AWS SES attempt returned AccessDenied, so actual live sending is **not yet verified**.

No production release authorized; no edits to main in this branch.