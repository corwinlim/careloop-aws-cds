# Build P0 — Safe SES Delivery Gate

This is **new isolated prototype code** and does not replace the existing unguarded `SESAdapter` call sites. It must be integrated through a reviewed follow-up PR before production use.

## How to test

```sh
PYTHONPATH=src python -m unittest tests.test_safe_delivery -v
```

Or run the full suite with `PYTHONPATH=src python -m unittest discover -s tests -v`.

## Security contract

- Sending is **disabled by default**. No AWS call in dry-run mode.
- Recipients must match an explicit allowlist.
- The entire request (recipient, body, subject, nonce, expiry) is HMAC-SHA256 bound; signature comparison is constant-time.
- The trusted server, **not the browser or an AI agent**, must sign approvals after authenticating the approver and verifying their authorization.
- Approvals expire; no approval with more than 5 minutes remaining is accepted.
- A replay nonce is claimed **before** contacting SES, so uncertain provider errors never trigger unreviewed retries.
- A provider API acknowledgement is not proof of inbox delivery.

## Not production ready

- `MemoryReplayStore` is **process-local**, not transactional or durable across replicas/restarts. Replace with DynamoDB conditional `PutItem` (unique nonce key) and retention/TTL.
- No concurrency claims are made for the memory implementation.
- No secret rotation or KMS/Secrets Manager wiring is included.
- Approval identity and RBAC checks occur **outside** this module and must be validated.
- This does not establish an AWS-deployed AI agent or successful SES delivery.
- Existing `src/careloop/channels/ses.py` can still call SES directly; integration and bypass-path inventory are required before a production gate.

## Ship gates

1. Review the trusted signer identity and threat model.
2. Replace replay store with atomic persistent implementation.
3. Ensure all SES paths use the guard; remove direct unapproved call paths.
4. Exercise tests, CI, IAM least privilege, SES sandbox send and failure reconciliation.
5. Keep demo/competition branch intact and merge only with documented evidence.
