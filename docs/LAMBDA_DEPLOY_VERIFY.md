# CareLoop synthetic AWS Lambda — Build & Ship

**Current status:** source + 5/5 local unit tests PASS. Not deployed to AWS. Deterministic rules, **not AI inference**. The hackathon's AWS-hosted AI requirement remains open.

## Local tests
From repository root (Python 3.11+):
```powershell
python -m unittest discover -s tests -p test_ship_lambda.py -v
```

## Lambda packaging and safe smoke
```powershell
Compress-Archive -Path ship_lambda -DestinationPath "$env:TEMP\careloop-lambda.zip" -Force
```
Use a dedicated authorized non-root staging deployer in ap-southeast-2. Deploy zip to Lambda function `careloop-staging-synthetic` with runtime Python 3.12+, handler `ship_lambda.handler.handler`, and a least-privilege execution role. **The existing CLI SES SmokeSender role is not a Lambda execution role and does not have deployment permission.**

Environment variables:
- `CARELOOP_SENDER=freshcanibowl@gmail.com`
- `CARELOOP_RECIPIENT=jacorponline@gmail.com`
- `CARELOOP_ENABLE_LIVE_SEND=false`

Lambda console synthetic test event:
```json
{"case_id":"SYN-001","observation":"appetite_change"}
```
Expected result: `status=dry_run`, `followup_required=true`, and a SHA256 digest. Capture Lambda request ID, invocation timestamp, CloudWatch evidence. **Dry-run sends no email.**

## Sending and approval limitations
The handler checks exact digest, explicit approval flag, `send_once=true`, and fixed staging identities before SES calls. However `send_once` is **not durable idempotency**. Do **not enable live send** until authenticated invocation, a persistent once-only approval ledger, execution role least-privilege SES policy and preflight review exist. SES accepted MessageId does not mean inbox delivery.

Current IAM Identity Center SmokeSender inline policy still includes only sender identity Resource and does not authorize the recipient identity. Correct and reprovision that existing policy separately. Lambda requires its own execution-role policy.

## Unmet hackathon requirements
This deterministic Lambda is **not** AWS-deployed AI. A real AWS-hosted AI component plus verified runtime CDS invocation, APN membership, real ACE Opportunity ID, public 3-minute video, uploaded architecture diagram, owner-approved LICENSE and Devpost final submit remain outstanding.
