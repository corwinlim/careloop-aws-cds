import unittest
from careloop.channels.safe_delivery import DeliveryRequest, MemoryReplayStore, SafeSESDelivery, sign_approval

SECRET = b"a" * 32

class StubSES:
    def __init__(self):
        self.calls = []
    def send_summary(self, to_email, subject, body):
        self.calls.append((to_email, subject, body))
        return {"MessageId": "synthetic-only"}

class SafeDeliveryTest(unittest.TestCase):
    def setUp(self):
        self.ses = StubSES()
        self.request = DeliveryRequest("owner@example.com", "Pet update", "Synthetic only", "n-123", 1200)
    def make(self, *, live=False, recipients=None):
        return SafeSESDelivery(
            self.ses, allowed_recipients=recipients or {"owner@example.com"},
            approval_secret=SECRET, replay_store=MemoryReplayStore(),
            live_enabled=live, clock=lambda: 1000,
        )
    def test_dry_run_never_sends(self):
        result = self.make().execute(self.request, approval_signature=sign_approval(self.request, SECRET))
        self.assertEqual(result["status"], "dry_run")
        self.assertFalse(self.ses.calls)
    def test_approval_required(self):
        self.assertEqual(self.make(live=True).execute(self.request)["reason"], "invalid_approval")
        self.assertFalse(self.ses.calls)
    def test_exact_payload_binding(self):
        altered = DeliveryRequest(self.request.to_email, "changed", self.request.body, self.request.nonce, self.request.expires_at)
        result = self.make(live=True).execute(altered, approval_signature=sign_approval(self.request, SECRET))
        self.assertEqual(result["reason"], "invalid_approval")
    def test_allowlist(self):
        result = self.make(live=True, recipients={"other@example.com"}).execute(
            self.request, approval_signature=sign_approval(self.request, SECRET))
        self.assertEqual(result["reason"], "recipient_not_allowlisted")
    def test_expired(self):
        expired = DeliveryRequest("owner@example.com", "S", "B", "n", 999)
        self.assertEqual(self.make(live=True).execute(expired)["reason"], "expired_or_overlong_approval")
    def test_overlong(self):
        future = DeliveryRequest("owner@example.com", "S", "B", "n", 1301)
        self.assertEqual(self.make(live=True).execute(future)["reason"], "expired_or_overlong_approval")
    def test_replay_prevented(self):
        delivery = self.make(live=True)
        sig = sign_approval(self.request, SECRET)
        self.assertEqual(delivery.execute(self.request, approval_signature=sig)["status"], "provider_accepted")
        self.assertEqual(delivery.execute(self.request, approval_signature=sig)["reason"], "replay_detected")
        self.assertEqual(len(self.ses.calls), 1)
    def test_small_secret_rejected(self):
        with self.assertRaises(ValueError):
            sign_approval(self.request, b"weak")
    def test_empty_message(self):
        req = DeliveryRequest("owner@example.com", "", "B", "n", 1200)
        self.assertEqual(self.make(live=True).execute(req)["reason"], "invalid_request")
