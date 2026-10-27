"""Synthetic staging follow-ups. Dry-run default; guarded at-most-one send attempt."""
import hashlib
import json
import os
import re
import time


def _approve_digest(recipient, subject, body):
    payload = json.dumps({"to": recipient, "subject": subject, "body": body}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def handler(event, context):
    event = event if isinstance(event, dict) else {}
    case_id = event.get("case_id")
    status = event.get("observation")
    if not isinstance(case_id, str) or not re.fullmatch(r"SYN-[A-Za-z0-9_-]{1,40}", case_id):
        return {"status": "rejected", "reason": "synthetic_case_id_required"}
    if status not in ("normal", "appetite_change", "needs_followup"):
        return {"status": "rejected", "reason": "unsupported_observation"}

    recipient = os.environ.get("CARELOOP_RECIPIENT", "")
    sender = os.environ.get("CARELOOP_SENDER", "")
    region = os.environ.get("AWS_REGION", "ap-southeast-2")
    if recipient != "jacorponline@gmail.com" or sender != "freshcanibowl@gmail.com":
        return {"status": "rejected", "reason": "staging_identity_allowlist"}

    followup = status != "normal"
    subject = "CareLoop synthetic follow-up - " + case_id
    body = ("Synthetic boarding/grooming test. " + case_id + ". " +
            ("Staff follow-up requested; no medical assessment." if followup else "Routine check-in. No action required."))
    digest = _approve_digest(recipient, subject, body)
    base = {"case_id": case_id, "followup_required": followup, "payload_sha256": digest}
    if os.environ.get("CARELOOP_ENABLE_LIVE_SEND") != "true":
        return {**base, "status": "dry_run", "reason": "live_send_disabled"}
    if event.get("approved_payload_sha256") != digest or event.get("explicit_staff_approval") is not True:
        return {**base, "status": "blocked", "reason": "exact_payload_approval_required"}
    if event.get("send_once") is not True:
        return {**base, "status": "blocked", "reason": "send_once_required"}

    # Fail closed unless an atomic durable claim ledger is configured.
    # Claim before sending: timeouts leave outcome uncertain, never auto-retry.
    table = os.environ.get("CARELOOP_SEND_LEDGER_TABLE", "")
    if not re.fullmatch(r"[A-Za-z0-9_.-]{3,255}", table):
        return {**base, "status": "blocked", "reason": "durable_send_ledger_required"}

    import boto3
    from botocore.exceptions import ClientError
    ddb = boto3.client("dynamodb", region_name=region)
    try:
        ddb.put_item(
            TableName=table,
            Item={"payload_digest": {"S": digest}, "case_id": {"S": case_id},
                  "state": {"S": "CLAIMED_UNCERTAIN"}, "created_at_epoch": {"N": str(int(time.time()))}},
            ConditionExpression="attribute_not_exists(payload_digest)",
        )
    except ClientError as exc:
        if exc.response.get("Error", {}).get("Code") == "ConditionalCheckFailedException":
            return {**base, "status": "blocked", "reason": "duplicate_or_previous_attempt"}
        raise

    ses = boto3.client("sesv2", region_name=region)
    result = ses.send_email(
        FromEmailAddress=sender, Destination={"ToAddresses": [recipient]},
        Content={"Simple": {"Subject": {"Data": subject}, "Body": {"Text": {"Data": body}}}},
    )
    return {**base, "status": "ses_accepted", "message_id": result["MessageId"]}
