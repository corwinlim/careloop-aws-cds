from dataclasses import dataclass

from careloop.domain.models import Observation


@dataclass(frozen=True)
class SafetyDecision:
    escalate: bool
    reason: str
    message: str


# Deterministic demo policy. It requests human review; it does not diagnose.
_RED_FLAGS = {
    "not eating at all",
    "cannot keep water down",
    "difficulty breathing",
    "collapsed",
    "unresponsive",
}


def evaluate(observation: Observation) -> SafetyDecision:
    normalized = observation.text.casefold()
    matched = next((flag for flag in _RED_FLAGS if flag in normalized), None)

    if matched:
        return SafetyDecision(
            escalate=True,
            reason=f"predefined_red_flag:{matched}",
            message="This response meets a predefined escalation rule. A human follow-up is requested.",
        )

    return SafetyDecision(
        escalate=False,
        reason="no_predefined_red_flag",
        message="Observation recorded. Continue the configured follow-up journey.",
    )
