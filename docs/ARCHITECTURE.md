# CareLoop V1 Architecture

```mermaid
flowchart LR
  A[Care Trigger] --> B[Journey Service]
  B --> C[WhatsApp / AWS Social Messaging]
  C --> D[Pet Parent]
  D --> E[Inbound Observation]
  E --> B
  B --> F[Deterministic Safety Policy]
  F -->|continue| G[RCS Follow-up]
  F -->|red flag| H[Human Escalation]
  G --> I[SES Journey Summary]
  H --> I
  B --> J[(Audit Events)]
```

## Runtime evidence rule
Mocks are permitted only in tests. Submission evidence must demonstrate actual qualifying AWS CDS calls from the production adapters.

## Product boundary
CareLoop owns communication journeys. It does not diagnose, prescribe, replace VetThread, or become CAIOS infrastructure.
