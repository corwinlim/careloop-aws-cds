from .models import AuditEvent, Journey, JourneyState, Observation


_ALLOWED = {
    JourneyState.CREATED: {JourneyState.CONTACTED},
    JourneyState.CONTACTED: {JourneyState.AWAITING_REPLY},
    JourneyState.AWAITING_REPLY: {JourneyState.OBSERVED},
    JourneyState.OBSERVED: {JourneyState.FOLLOW_UP, JourneyState.ESCALATED},
    JourneyState.FOLLOW_UP: {JourneyState.AWAITING_REPLY, JourneyState.ESCALATED, JourneyState.COMPLETED},
    JourneyState.ESCALATED: {JourneyState.COMPLETED},
    JourneyState.COMPLETED: set(),
}


def transition(journey: Journey, target: JourneyState) -> Journey:
    if target not in _ALLOWED[journey.state]:
        raise ValueError(f"Invalid transition: {journey.state} -> {target}")
    previous = journey.state
    journey.state = target
    journey.audit_events.append(
        AuditEvent("journey.transition", {"from": previous.value, "to": target.value})
    )
    return journey


def record_observation(journey: Journey, observation: Observation) -> Journey:
    if journey.state != JourneyState.AWAITING_REPLY:
        raise ValueError("Journey must be awaiting a reply before recording an observation.")
    journey.observations.append(observation)
    journey.audit_events.append(
        AuditEvent("observation.recorded", {"category": observation.category, "text": observation.text})
    )
    return transition(journey, JourneyState.OBSERVED)
