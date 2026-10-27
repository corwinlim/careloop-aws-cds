# CareLoop — final submission checklist (28 October 2026)

**Event:** AWS CDS Agentic AI Partner Hackathon  
**Deadline:** 28 October 2026 20:00 UTC / 29 October 2026 04:00 MYT  
**Devpost:** https://devpost.com/software/careloop-agentic-pet-care-communication

## Mandatory gates
- [ ] Verify AWS Partner Network eligibility, submit accurate company legal name.
- [ ] Obtain actual **ACE Opportunity ID** from AWS Partner Central, with campaign `AWS CDS Agentic AI Hackathon -Sept. 2026`. Do not fabricate IDs.
- [ ] Confirm *AWS-deployed* AI solution and a genuine CDS invocation at runtime. Locally mocked SES calls are insufficient.
- [ ] Publish and attach a ~3 minute **public YouTube/Vimeo demo** accurately differentiating Mock and AWS.
- [ ] Upload an **architecture diagram** to the required Devpost file question.
- [ ] Verify reproducible repository, install/run instructions, safe synthetic demo, no secrets.
- [ ] **Select an open-source license with owner approval**, add root LICENSE, ensure GitHub detects license.
- [ ] Answer required form fields truthfully, including personal eligibility attestations.
- [ ] Submit to the hackathon and re-read Devpost state until `submitted_at` is not null.

## Verified technical evidence
- AWS account 616804588598, region ap-southeast-2.
- STS non-root IAM Identity Center roles: CareLoop-Staging-ReadOnly and CareLoop-SES-SmokeSender.
- SES verified identities: freshcanibowl@gmail.com (sender), jacorponline@gmail.com (test recipient).
- SES SendEmail currently returns `AccessDeniedException` for `identity/jacorponline@gmail.com`. No MessageId.
- AWS cloud runtime deployment evidence: not obtained.
- Python prototype includes boto3 SES adapter. Standalone SQLite approval/outbox/worker packages require actual integration audit.

## SES permission blocker
Current smoke Permission Set policy lists only SES sender identity ARN. The denied SES API call names the *recipient identity* ARN. Before any retry, authorized administrator must amend the **existing** SmokeSender Permission Set in AWS Identity Center with the recipient identity ARN as necessary, preserve FromAddress/Recipients conditions, and reprovision target account. Confirm the effective policy is updated; do not alter ReadOnly or add AdministratorAccess. Exactly one synthetic test email only after authorization. Stop on network timeout/unknown outcome to avoid duplicate sends.

## What this file does not assert
It is not evidence of live SES delivery, deployed AI execution, APN enrollment, valid ACE Opportunity, or Devpost submission. All are separate release gates.
