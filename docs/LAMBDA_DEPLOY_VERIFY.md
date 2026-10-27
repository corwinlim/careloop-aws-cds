# CareLoop staging Lambda — guarded Build & Ship

**Status as of 28 October 2026:** source and **9 local tests PASS** (7 validation + 2 atomic-send mock tests). **Not deployed to AWS; no Bedrock/AI inference**. Event qualification requires additional actual AWS runtime and ACE/APN evidence.

## Run tests (repo root, Python 3.11+)
```powershell
python -m pip install -r requirements.txt
$env:PYTHONPATH = (Get-Location).Path
python -m unittest discover -s tests -p "test_ship_lambda*.py" -v
```

## Dry-run first — deployment runbook
Package `ship_lambda` in the Lambda zip root:
```powershell
Compress-Archive -Path ship_lambda -DestinationPath "$env:TEMP\careloop-lambda.zip" -Force
```
Use dedicated **non-root staging deployment credentials** in ap-southeast-2. Deploy an authorized Python 3.12+ Lambda with handler `ship_lambda.handler.handler`. The existing CLI `CareLoop-SES-SmokeSender` Permission Set **cannot** serve as Lambda's execution role or grant deployment privileges.

Staging environment:
```
CARELOOP_SENDER=freshcanibowl@gmail.com
CARELOOP_RECIPIENT=jacorponline@gmail.com
CARELOOP_ENABLE_LIVE_SEND=false
```
Invoke with synthetic test input:
```json
{"case_id":"SYN-001","observation":"appetite_change"}
```
Expected: `status=dry_run`, no live SES. Capture Lambda function ARN, timestamp, AWS RequestId, CloudWatch log, and configuration showing live sending disabled.

## Explicitly gated live mode — NOT RELEASED
In addition to exact-payload approval and sender/recipient allowlisting, live mode requires:
- `CARELOOP_ENABLE_LIVE_SEND=true` (must remain **false** until separate security review);
- `CARELOOP_SEND_LEDGER_TABLE` configured to a dedicated DynamoDB table with **string partition key `payload_digest`**;
- conditional DynamoDB `PutItem` permission scoped to that table and Lambda execution role;
- Lambda execution role permitted to send only through the SES staging identities;
- authenticated, independently issued approval and restricted invocation surface.

Before SES, the handler claims the digest via DynamoDB conditional `PutItem`; on duplicates it blocks, on ambiguous claim failure it does not send. **Claims are permanently reserved even on SES denial or timeout**: manual reconciliation is required; there is no automatic resend. This is a *one-attempt control*, not an approval authority or end-to-end production guarantee.

The stored state is `CLAIMED_UNCERTAIN` and is never automatically upgraded to delivered. Avoid mistaking `ses_accepted` for inbox delivery. Do not expose the Lambda as an anonymous public function URL or enable live sending using client-supplied approval booleans alone.

## Current blockers
No confirmed AWS Lambda staging deployment; live SES SendEmail returned AccessDenied naming recipient identity; current Identity Center sender policy Resource needs operator-authorized correction and reprovision; no deployed AWS AI component. APN membership / real ACE Opportunity ID, root repository license, ~3 minute public demo, uploaded architecture and final Devpost submission also remain unverified.
