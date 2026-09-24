from typing import Any
import boto3


class SESAdapter:
    def __init__(self, from_email: str, client: Any | None = None):
        self.from_email = from_email
        self.client = client or boto3.client("sesv2")

    def send_summary(self, to_email: str, subject: str, body: str) -> dict[str, Any]:
        return self.client.send_email(
            FromEmailAddress=self.from_email,
            Destination={"ToAddresses": [to_email]},
            Content={"Simple": {
                "Subject": {"Data": subject},
                "Body": {"Text": {"Data": body}},
            }},
        )
