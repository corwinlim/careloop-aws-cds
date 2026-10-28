"""Security regression tests for independently signed CareLoop staging approvals."""
import hashlib
import hmac
import os
import time
from unittest.mock import patch

from ship_lambda.handler import handler

KEY = "test-only-signing-key-32-bytes-minimum-abcdef"
ENV = {
    "CARELOOP_SENDER": "freshcanibowl@gmail.com",
    "CARELOOP_RECIPIENT": "jacorponline@gmail.com",
    "CARELOOP_ENABLE_LIVE_SEND": "true",
    "CARELOOP_APPROVAL_SIGNING_KEY": KEY,
    "CARELOOP_SEND_LEDGER_TABLE": "careloop-demo-ledger",
}
BASE = {"case_id": "SYN-001", "observation": "appetite_change"}


def signed_event(age=0):
    with patch.dict(os.environ, dict(ENV, CARELOOP_ENABLE_LIVE_SEND="false")):
        digest = handler(BASE, None)["payload_sha256"]
    issued = int(time.time()) - age
    payload = f"careloop-v1:SYN-001:{digest}:{issued}".encode()
    sig = hmac.new(KEY.encode(), payload, hashlib.sha256).hexdigest()
    return dict(BASE, approved_payload_sha256=digest, explicit_staff_approval=True,
                send_once=True, approved_at_epoch=issued, approval_signature=sig)


def test_unsigned_caller_approval_denied():
    e = signed_event()
    e["approval_signature"] = "0" * 64
    with patch.dict(os.environ, ENV), patch("boto3.client") as client:
        assert handler(e, None)["reason"] == "trusted_approval_signature_required"
        client.assert_not_called()


def test_expired_signature_denied():
    with patch.dict(os.environ, ENV), patch("boto3.client") as client:
        assert handler(signed_event(age=301), None)["reason"] == "trusted_approval_signature_required"
        client.assert_not_called()


def test_signing_secret_absent_denied():
    e = signed_event()
    env = dict(ENV)
    env.pop("CARELOOP_APPROVAL_SIGNING_KEY")
    with patch.dict(os.environ, env, clear=True), patch("boto3.client") as client:
        assert handler(e, None)["reason"] == "trusted_approval_signature_required"
        client.assert_not_called()


def test_case_id_tamper_denied():
    e = signed_event()
    e["case_id"] = "SYN-002"
    with patch.dict(os.environ, ENV), patch("boto3.client") as client:
        assert handler(e, None)["status"] == "blocked"
        client.assert_not_called()


def test_future_signature_denied():
    with patch.dict(os.environ, ENV), patch("boto3.client") as client:
        assert handler(signed_event(age=-60), None)["reason"] == "trusted_approval_signature_required"
        client.assert_not_called()
