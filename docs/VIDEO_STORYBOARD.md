# CareLoop — ~3 minute demo storyboard

**Goal:** demonstrate an actual, bounded pet boarding/grooming follow-up journey with honest labels for all mocks.

00:00–00:20 — Real customer problem. Pet grooming/boarding visits often lose follow-up context.

00:20–00:50 — Show the existing prototype Journey case using synthetic pet observations. Clearly identify the specific app/screens as prototype/demo.

00:50–01:25 — Show approval/allowlist test cases. If using a *separate* SQLite demo instead of the public repo, label it 'local prototype; integration pending'. Never show real customer details.

01:25–02:00 — Show Python AWS SES adapter and read-only AWS configuration proof. SES sender/recipient verification + non-root STS are real; do not expose authentication codes or tokens.

02:00–02:20 — If a successful real AWS-hosted AI→SES end-to-end test is obtained, show its CloudWatch and SES MessageId; otherwise clearly state 'AWS runtime proof pending; SES SendEmail currently AccessDenied' instead of falsely depicting success.

02:20–02:40 — Show a Journey timeline and safety escalation from synthetic fixtures, clarify mocked screens.

02:40–03:00 — Technical architecture, reproducible repo link, clear limits and roadmap.

**Submission gate:** the event requires deployment of an AI solution on AWS using at least one AWS CDS service, not merely a mock demo. A video that admits incomplete cloud proof is honest, but may still be ineligible.
