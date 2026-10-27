# CareLoop — Agentic Pet Care Communication

CareLoop explores safety-gated follow-up journeys after pet boarding and grooming visits. **Current repository status: Python prototype; not a production system or verified AWS deployment.**

## Verified implementation in this repository

- Python Journey models and deterministic transition / escalation policies.
- SESv2 adapter at `src/careloop/channels/ses.py` using `boto3.client("sesv2").send_email`.
- Local tests and synthetic Pika fixtures.

Separate local Build 9–11 experiments explored an approval gate, SQLite delivery outbox, and delivery worker. **Those independent prototype packages have not been confirmed integrated into this repository's default branch.** The external boarding/grooming web demo is also not verified as part of this repository.

## AWS evidence status (28 October 2026)

- AWS account **616804588598**; region **ap-southeast-2**.
- Non-root IAM Identity Center SSO roles were independently verified using `sts get-caller-identity`.
- SES sender `freshcanibowl@gmail.com` and test recipient `jacorponline@gmail.com` are verified in SES sandbox.
- Live SES `SendEmail` was attempted but returned `AccessDeniedException` for the recipient identity ARN. **No SES MessageId or successful delivery is verified.**
- AWS-hosted AI workflow / Lambda runtime execution is **not yet evidenced**. Do not present local mock tests as cloud deployment proof.

## Run locally

This repository's Python layout is `src/careloop/`, with tests under `tests/`. From a local checkout (Python 3.11+), set up a virtual environment and install dependencies as specified by project files; then execute:

```bash
python -m unittest discover -s tests -v
```

If imports fail because the local project is not installed, use `PYTHONPATH=src` (PowerShell: `$env:PYTHONPATH="src"`) before running. Results depend on installed dependencies; the exact command above has **not** been independently run against this GitHub commit during the final audit.

## Safety boundaries

Use synthetic data only. Do not use real customer or pet medical data. Approval, recipient allowlists, and provider responses must be verified end-to-end prior to any real sending. SES API acceptance does not establish inbox delivery. The prototype does not diagnose, prescribe, or replace veterinary advice.

## Hackathon

- Devpost: https://devpost.com/software/careloop-agentic-pet-care-communication
- Event: https://aws-cds-partner.devpost.com/
- Deadline: 28 October 2026 20:00 UTC (29 October 2026 04:00 MYT).

**Eligibility and ship blockers:** APN membership and ACE Opportunity ID unverified; AWS-deployed AI/CDS runtime evidence missing; architecture upload and public demo video outstanding; public open-source `LICENSE` file not yet selected by the project owner. This public repository currently has no detected root `LICENSE`. An open-source license must be chosen and added before claiming compliance with the event's public-repository rule.

## Architecture ownership

- CareLoop: communication journey.
- VetThread: veterinary longitudinal workflow.
- CAIOS: companion context and evidence.

Other channels (WhatsApp, RCS, SMS) are **roadmap concepts**, not verified CareLoop runtime integrations.
