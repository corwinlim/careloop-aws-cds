# CareLoop — AWS CDS Longitudinal Customer Follow-up Agent

> One interaction becomes a continuous care relationship.

CareLoop is an agentic communication layer for continuous, measurable customer follow-up journeys.

## Hackathon V1

Golden path:

1. A care interaction ends and a Journey is created.
2. CareLoop sends a Day-1 WhatsApp follow-up.
3. The pet parent replies with an observation.
4. CareLoop records structured context and evaluates deterministic safety policy.
5. A predefined rule can request human follow-up without diagnosing.
6. The journey is auditable and can later continue through RCS and SES.

## Boundaries

- CareLoop owns the communication journey.
- VetThread owns veterinary longitudinal workflow.
- CAIOS owns companion context/evidence infrastructure.
- V1 does not diagnose or prescribe treatment.

## Status

Build Sprint P1A: domain model, state machine, deterministic safety policy, audit trail, and Pika demo fixture.
