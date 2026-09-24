from careloop.domain.models import Journey, JourneyState
from careloop.domain.state_machine import transition
from careloop.journeys.service import JourneyService


def awaiting_journey():
    j = Journey(pet_name="Pika", contact_id="parent-001")
    transition(j, JourneyState.CONTACTED)
    transition(j, JourneyState.AWAITING_REPLY)
    return j


def test_pika_half_dinner_continues_followup():
    j = awaiting_journey()
    decision = JourneyService().receive_parent_reply(j, "Pika only ate half his dinner.")
    assert decision.escalate is False
    assert j.state == JourneyState.FOLLOW_UP


def test_red_flag_routes_to_human_escalation():
    j = awaiting_journey()
    decision = JourneyService().receive_parent_reply(j, "Pika is unresponsive")
    assert decision.escalate is True
    assert j.state == JourneyState.ESCALATED
