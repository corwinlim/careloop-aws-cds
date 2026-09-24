from unittest.mock import Mock
from careloop.channels.ses import SESAdapter


def test_ses_adapter_calls_sesv2_send_email():
    client = Mock()
    client.send_email.return_value = {"MessageId": "ses-demo"}
    result = SESAdapter("careloop@example.com", client).send_summary(
        "parent@example.com", "Pika follow-up summary", "Journey summary"
    )
    assert result["MessageId"] == "ses-demo"
    client.send_email.assert_called_once()
