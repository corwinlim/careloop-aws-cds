# CareLoop — Final release receipt (2026-10-28 14:12 MYT)

**Project:** https://devpost.com/software/careloop-agentic-pet-care-communication  
**Submission deadline:** 2026-10-28 20:00 UTC / 2026-10-29 04:00 MYT  
**Repository:** https://github.com/corwinlim/careloop-aws-cds  
**Review surface:** https://github.com/corwinlim/careloop-aws-cds/pull/1

## Verified PASS — source and mocked tests only

- Python security improvement: HMAC-SHA256 signed approval, bound to synthetic case/payload, with short acceptance window and fail-closed checks.
- DynamoDB conditional PutItem intended to reserve each payload digest before one outbound attempt. A mock test covers this ordering. No real DynamoDB execution receipt.
- GitHub Actions run **40642141094**, head commit **390bbf6cd5dc1cd5484e1ac1e3d331646ecb7783**, **completed: success**.
- PR #1 still draft. Review-thread query returned no threads; **absence of threads does not mean approved review**.

## Confirmed limitations and release blockers

1. **AWS Partner Network / ACE Opportunity ID**: partner status not confirmed, genuine event-campaign ACE ID not obtained. Do not enter invented IDs.
2. **AWS-hosted AI + CDS**: AWS-deployed AI inference and successful real SES message **not evidenced**. Previous SES SendEmail returned AccessDenied for recipient identity ARN. Earlier Sydney Lambda ListFunctions returned zero; no CloudWatch execution evidence.
3. **Video**: Devpost project video_url is null. Need real ~3-minute public/unlisted demonstration.
4. **Open-source license**: project owner has not authorized Apache-2.0/MIT or any other open-source license. No root LICENSE verified. This must not be auto-assigned.
5. **Devpost submission**: `submitted_at = null` on 2026-10-28 check. A published page is not a submitted entry.

## Hardening limitations (even if CI passes)

- HMAC signing key is an environment secret; it requires secret-management and an independently authenticated signer service, neither presently verified.
- The Lambda's client-provided `explicit_staff_approval` and HMAC provide no actual reviewer identity or human authorization evidence until the signer is deployed with authentication and a trusted approval record.
- Signed approvals can be copied during their validity period; DynamoDB conditional digest reservation is meant to block re-use but requires verified live IAM policy, persistence, role isolation and runtime tests.
- A DynamoDB claim before SES may remain `CLAIMED_UNCERTAIN` on timeout or denial. No automatic retries; human reconciliation needed.
- A SES MessageId would establish provider acceptance only, not delivery.

## Required next human/operator actions

- Open AWS Partner Central in the authenticated console and establish true APN / ACE eligibility.
- Obtain a legitimate least-privilege non-root deploy identity and independent approval service before enabling any live send.
- Record a demonstration featuring *only actually verified* states, upload to YouTube/Vimeo, and attach architecture diagram to Devpost.
- Decide the repository's authorized open-source LICENSE scope.
- Complete required legal declarations and final submission; confirm a non-null `submitted_at` / official confirmation.

**SHIP DECISION: NO-GO until the applicable required eligibility, technical, video, license and Devpost gates are genuinely closed.** CI green is not a substitute for any of them.
