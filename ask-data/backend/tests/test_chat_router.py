import unittest

from app.services.chat_router import (
    build_acknowledgement_answer,
    build_farewell_answer,
    build_greeting_answer,
    is_acknowledgement,
    is_farewell,
    is_greeting_or_smalltalk,
    looks_like_data_request,
)


class ChatRouterTestCase(unittest.TestCase):
    def test_indonesian_greeting_is_detected(self) -> None:
        self.assertTrue(is_greeting_or_smalltalk("selamat pagi"))
        answer = build_greeting_answer("selamat pagi")
        self.assertIn("Data Analyst Assistant", answer)
        self.assertIn("Berapa total saldo deposito saat ini?", answer)
        self.assertIn("Berapa total outstanding kredit saat ini?", answer)

    def test_indonesian_acknowledgement_is_detected(self) -> None:
        self.assertTrue(is_acknowledgement("makasih ya"))
        answer = build_acknowledgement_answer("makasih ya")
        self.assertIn("Sama-sama", answer)

    def test_acknowledgement_does_not_swallow_data_request(self) -> None:
        self.assertFalse(is_acknowledgement("baik data total nasabah per bulan"))
        self.assertTrue(looks_like_data_request("baik data total nasabah per bulan"))

    def test_chart_followups_are_data_requests(self) -> None:
        self.assertTrue(looks_like_data_request("dalam bentuk linechart aja"))
        self.assertTrue(looks_like_data_request("keluarkan aja udah"))
        self.assertTrue(looks_like_data_request("tampilkan grafik tren bulanan"))

    def test_farewell_is_detected(self) -> None:
        self.assertTrue(is_farewell("sampai jumpa"))
        answer = build_farewell_answer("sampai jumpa")
        self.assertIn("sampai jumpa", answer.lower())


if __name__ == "__main__":
    unittest.main()
