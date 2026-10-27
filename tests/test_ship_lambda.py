import os
import sys
import unittest
from unittest.mock import patch
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from ship_lambda.handler import handler

ENV = {"CARELOOP_SENDER": "freshcanibowl@gmail.com", "CARELOOP_RECIPIENT": "jacorponline@gmail.com", "CARELOOP_ENABLE_LIVE_SEND": "false"}
EVENT = {"case_id": "SYN-001", "observation": "appetite_change"}

class HandlerTests(unittest.TestCase):
    def test_dry_run(self):
        with patch.dict(os.environ, ENV):
            r = handler(EVENT, None)
        self.assertEqual(r['status'], 'dry_run')
        self.assertTrue(r['followup_required'])
        self.assertEqual(len(r['payload_sha256']), 64)

    def test_reject_non_synthetic(self):
        with patch.dict(os.environ, ENV):
            self.assertEqual(handler({"case_id": "real_pet", "observation": "normal"}, None)['status'], 'rejected')

    def test_no_email_without_exact_approval(self):
        env = dict(ENV, CARELOOP_ENABLE_LIVE_SEND='true')
        with patch.dict(os.environ, env):
            self.assertEqual(handler(EVENT, None)['status'], 'blocked')
            self.assertEqual(handler(dict(EVENT, approved_payload_sha256='bad', explicit_staff_approval=True, send_once=True), None)['status'], 'blocked')

    def test_identity_allowlist(self):
        with patch.dict(os.environ, dict(ENV, CARELOOP_RECIPIENT='other@gmail.com')):
            self.assertEqual(handler(EVENT, None)['reason'], 'staging_identity_allowlist')

    def test_normal_is_not_medical(self):
        with patch.dict(os.environ, ENV):
            self.assertFalse(handler(dict(EVENT, observation='normal'), None)['followup_required'])

    def test_no_ledger_blocks_approved_send(self):
        with patch.dict(os.environ, dict(ENV, CARELOOP_ENABLE_LIVE_SEND='true'), clear=True):
            dry = handler(EVENT, None)
            approved = dict(EVENT, approved_payload_sha256=dry['payload_sha256'], explicit_staff_approval=True, send_once=True)
            self.assertEqual(handler(approved, None)['reason'], 'durable_send_ledger_required')

    def test_rejects_malformed_input(self):
        with patch.dict(os.environ, ENV):
            for event in (None, {"case_id": None, "observation": "normal"}, {"case_id": "SYN-001", "observation": 4}):
                self.assertEqual(handler(event, None)['status'], 'rejected')

if __name__ == '__main__':
    unittest.main()
