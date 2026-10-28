"""Mock-only tests for atomic send claim and duplicate suppression."""
import os
import hashlib
import hmac
import time
import unittest
from unittest.mock import Mock, patch
from botocore.exceptions import ClientError
from ship_lambda.handler import handler

ENV = {"CARELOOP_SENDER": "freshcanibowl@gmail.com",
       "CARELOOP_RECIPIENT": "jacorponline@gmail.com",
       "CARELOOP_ENABLE_LIVE_SEND": "true",
       "CARELOOP_SEND_LEDGER_TABLE": "careloop-demo-ledger"}
EVENT = {"case_id": "SYN-001", "observation": "appetite_change"}
SIGNING_KEY = "dev-test-signing-key-never-use-in-prod-123456789"
ENV["CARELOOP_APPROVAL_SIGNING_KEY"] = SIGNING_KEY

def approved():
    with patch.dict(os.environ, dict(ENV, CARELOOP_ENABLE_LIVE_SEND="false")):
        digest = handler(EVENT, None)["payload_sha256"]
    issued = int(time.time())
    message = f"careloop-v1:{EVENT['case_id']}:{digest}:{issued}".encode("ascii")
    signature = hmac.new(SIGNING_KEY.encode(), message, hashlib.sha256).hexdigest()
    return dict(EVENT, approved_payload_sha256=digest, explicit_staff_approval=True, send_once=True, approved_at_epoch=issued, approval_signature=signature)

class AtomicSendTests(unittest.TestCase):
    def test_claim_before_mock_ses(self):
        ddb, ses = Mock(), Mock()
        order = []
        ddb.put_item.side_effect = lambda **kwargs: order.append("claim")
        ses.send_email.side_effect = lambda **kwargs: (order.append("send") or {"MessageId": "MOCK_ONLY"})
        with patch.dict(os.environ, ENV), patch("boto3.client", side_effect=lambda service_name, **kwargs: {"dynamodb": ddb, "sesv2": ses}[service_name]):
            r = handler(approved(), None)
        self.assertEqual(r["status"], "ses_accepted")
        self.assertEqual(order, ["claim", "send"])
        self.assertEqual(ddb.put_item.call_args.kwargs["ConditionExpression"], "attribute_not_exists(payload_digest)")

    def test_duplicate_prevents_ses(self):
        ddb, ses = Mock(), Mock()
        ddb.put_item.side_effect = ClientError({"Error":{"Code":"ConditionalCheckFailedException","Message":"duplicate"}}, "PutItem")
        with patch.dict(os.environ, ENV), patch("boto3.client", side_effect=lambda service_name, **kwargs: {"dynamodb": ddb, "sesv2": ses}[service_name]):
            r = handler(approved(), None)
        self.assertEqual(r["reason"], "duplicate_or_previous_attempt")
        ses.send_email.assert_not_called()
