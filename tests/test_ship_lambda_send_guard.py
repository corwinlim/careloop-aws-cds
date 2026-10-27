"""Mock-only tests for atomic send claim and duplicate suppression."""
import os
import unittest
from unittest.mock import Mock, patch
from botocore.exceptions import ClientError
from ship_lambda.handler import handler

ENV = {"CARELOOP_SENDER": "freshcanibowl@gmail.com",
       "CARELOOP_RECIPIENT": "jacorponline@gmail.com",
       "CARELOOP_ENABLE_LIVE_SEND": "true",
       "CARELOOP_SEND_LEDGER_TABLE": "careloop-demo-ledger"}
EVENT = {"case_id": "SYN-001", "observation": "appetite_change"}

def approved():
    with patch.dict(os.environ, dict(ENV, CARELOOP_ENABLE_LIVE_SEND="false")):
        digest = handler(EVENT, None)["payload_sha256"]
    return dict(EVENT, approved_payload_sha256=digest, explicit_staff_approval=True, send_once=True)

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
