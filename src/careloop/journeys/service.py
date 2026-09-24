from careloop.domain.models import Journey, JourneyState, Observation
from careloop.domain.state_machine import record_observation, transition
from careloop.policy.escalation import evaluate


class JourneyService:
    def receive_parent_reply(self, journey: Journey, text: str):
        observation = Observation(text=text, category="appetite")
        record_observation(journey, observation)
        decision = evaluate(observation)
        if decision.escalate:
            transition(journey, JourneyState.ESCALATED)
        else:
            transition(journey, JourneyState.FOLLOW_UP)
        return decision
