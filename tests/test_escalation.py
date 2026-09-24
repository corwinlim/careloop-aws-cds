from careloop.domain.models import Observation
from careloop.policy.escalation import evaluate


def test_half_dinner_does_not_diagnose_or_force_escalation():
    decision = evaluate(Observation(text="Pika only ate half his dinner."))
    assert decision.escalate is False


def test_predefined_red_flag_requests_human_followup():
    decision = evaluate(Observation(text="Pika is unresponsive"))
    assert decision.escalate is True
    assert "human follow-up" in decision.message
