from unittest.mock import Mock

from careloop.channels.whatsapp import WhatsAppAdapter


def test_whatsapp_adapter_calls_aws_socialmessaging_runtime():
    client = Mock()
    client.send_whatsapp_message.return_value = {"messageId": "demo-message-id"}

    adapter = WhatsAppAdapter("phone-number-id", client=client)
    result = adapter.send_text("+60100000000", "How is Pika today?")

    assert result["messageId"] == "demo-message-id"
    client.send_whatsapp_message.assert_called_once()
