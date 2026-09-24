from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4


class JourneyState(str, Enum):
    CREATED = "CREATED"
    CONTACTED = "CONTACTED"
    AWAITING_REPLY = "AWAITING_REPLY"
    OBSERVED = "OBSERVED"
    FOLLOW_UP = "FOLLOW_UP"
    ESCALATED = "ESCALATED"
    COMPLETED = "COMPLETED"


@dataclass
class Observation:
    text: str
    category: str = "free_text"
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AuditEvent:
    event_type: str
    payload: dict[str, Any]
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class Journey:
    pet_name: str
    contact_id: str
    id: str = field(default_factory=lambda: str(uuid4()))
    state: JourneyState = JourneyState.CREATED
    observations: list[Observation] = field(default_factory=list)
    audit_events: list[AuditEvent] = field(default_factory=list)
