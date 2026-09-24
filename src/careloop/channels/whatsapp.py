import json
from typing import Any

import boto3


class WhatsAppAdapter:
    """AWS End User Messaging Social adapter.

    Production path intentionally performs a real boto3 CDS call. Tests should mock
    the AWS client rather than replacing this adapter with a fake implementation.
    """

    def __init__(self, origination_phone_number_id: str, client: Any | None = None):
        self.origination_phone_number_id = origination_phone_number_id
        self.client = client or boto3.client("socialmessaging")

    def send_text(self, to: str, body: str) -> dict[str, Any]:
        payload = {
            "messaging_product": "whatsapp",
            "to": to,
            "type": "text",
            "text": {"body": body},
        }
        return self.client.send_whatsapp_message(
            originationPhoneNumberId=self.origination_phone_number_id,
            message=json.dumps(payload).encode("utf-8"),
            metaApiVersion="v20.0",
        )
