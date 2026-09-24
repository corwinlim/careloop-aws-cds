from typing import Any
import boto3


class RCSAdapter:
    def __init__(self, origination_identity: str, client: Any | None = None):
        self.origination_identity = origination_identity
        self.client = client or boto3.client("pinpoint-sms-voice-v2")

    def send(self, destination_phone_number: str, message_body: str) -> dict[str, Any]:
        return self.client.send_rcs_message(
            DestinationPhoneNumber=destination_phone_number,
            OriginationIdentity=self.origination_identity,
            MessageBody=message_body,
        )
