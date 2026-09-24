import pytest

from careloop.domain.models import Journey, JourneyState, Observation
from careloop.domain.state_machine import record_observation, transition


def test_pika_day1_journey_records_observation():
    journey = Journey(pet_name="Pika", contact_id="parent-001")
    transition(journey, JourneyState.CONTACTED)
    transition(journey, JourneyState.AWAITING_REPLY)

    record_observation(
        journey,
        Observation(text="Pika only ate half his dinner.", category="appetite"),
    )

    assert journey.state == JourneyState.OBSERVED
    assert journey.observations[0].category == "appetite"
    assert any(event.event_type == "observation.recorded" for event in journey.audit_events)


def test_invalid_transition_is_rejected():
    journey = Journey(pet_name="Pika", contact_id="parent-001")
    with pytest.raises(ValueError):
        transition(journey, JourneyState.COMPLETED)
