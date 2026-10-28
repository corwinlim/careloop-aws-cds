"""Safety-gated SES delivery. Prototype: memory replay store is NOT multi-worker safe."""
from __future__ import annotations
from dataclasses import dataclass
from hashlib import sha256
from hmac import compare_digest, new as hmac_new
import json
import time
from typing import Any, Protocol

class ReplayStore(Protocol):
    def claim(self, nonce: str) -> bool: ...

class MemoryReplayStore:
    """Process-local only; production must use an atomic durable store."""
    def __init__(self) -> None:
        self._seen: set[str] = set()
    def claim(self, nonce: str) -> bool:
        if nonce in self._seen:
            return False
        self._seen.add(nonce)
        return True

@dataclass(frozen=True)
class DeliveryRequest:
    to_email: str
    subject: str
    body: str
    nonce: str
    expires_at: int

def _payload(request: DeliveryRequest) -> bytes:
    return json.dumps({
        "body": request.body,
        "expires_at": request.expires_at,
        "nonce": request.nonce,
        "subject": request.subject,
        "to_email": request.to_email.strip().lower(),
        "v": 1,
    }, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")

def sign_approval(request: DeliveryRequest, secret: bytes) -> str:
    """Must be called only from a trusted, authenticated approval service."""
    if len(secret) < 32:
        raise ValueError("approval secret must be at least 32 bytes")
    return hmac_new(secret, _payload(request), sha256).hexdigest()

class SafeSESDelivery:
    def __init__(self, ses_adapter: Any, *, allowed_recipients: set[str],
                 approval_secret: bytes, replay_store: ReplayStore,
                 live_enabled: bool = False, clock: Any = time.time):
        if len(approval_secret) < 32:
            raise ValueError("approval secret must be at least 32 bytes")
        self.adapter = ses_adapter
        self.allowed_recipients = {email.strip().lower() for email in allowed_recipients}
        self.secret = approval_secret
        self.replay_store = replay_store
        self.live_enabled = live_enabled
        self.clock = clock

    def execute(self, request: DeliveryRequest, *, approval_signature: str | None = None) -> dict[str, Any]:
        email = request.to_email.strip().lower()
        if not email or email not in self.allowed_recipients:
            return {"status": "blocked", "reason": "recipient_not_allowlisted"}
        if not request.nonce or not request.subject.strip() or not request.body.strip():
            return {"status": "blocked", "reason": "invalid_request"}
        now = int(self.clock())
        if request.expires_at <= now or request.expires_at > now + 300:
            return {"status": "blocked", "reason": "expired_or_overlong_approval"}
        if not self.live_enabled:
            return {"status": "dry_run", "reason": "live_delivery_disabled"}
        if not approval_signature or not compare_digest(
            sign_approval(request, self.secret), approval_signature
        ):
            return {"status": "blocked", "reason": "invalid_approval"}
        if not self.replay_store.claim(request.nonce):
            return {"status": "blocked", "reason": "replay_detected"}
        # Fail closed: do not blindly retry after an uncertain provider result.
        response = self.adapter.send_summary(email, request.subject, request.body)
        return {"status": "provider_accepted", "provider_response": response}
