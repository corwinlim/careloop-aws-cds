from unittest.mock import Mock
from careloop.channels.rcs import RCSAdapter


def test_rcs_adapter_calls_qualifying_cds_api():
    client = Mock()
    client.send_rcs_message.return_value = {"MessageId": "rcs-demo"}
    result = RCSAdapter("rcs-origin", client).send("+60100000000", "Confirm Pika follow-up")
    assert result["MessageId"] == "rcs-demo"
    client.send_rcs_message.assert_called_once()
