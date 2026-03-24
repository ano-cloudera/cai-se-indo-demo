import unittest

from app.core.config import Settings
from app.services.prompt_builder import build_prompt_debug_view


class PromptContextTestCase(unittest.TestCase):
    def test_prompt_includes_business_and_schema_context(self) -> None:
        settings = Settings(
            DB_NAME="demo_db",
            SQL_ALLOWED_TABLES="customers,deposits,credits",
        )

        prompt_view = build_prompt_debug_view(
            question="Show top customers by balance",
            settings=settings,
        )

        self.assertIn("banking customer, deposit, and credit analytics demo", prompt_view["system_prompt"])
        self.assertIn("customers.customer_id = deposits.customer_id", prompt_view["system_prompt"])
        self.assertIn("customers.customer_id = credits.customer_id", prompt_view["system_prompt"])
        self.assertIn("top customers by balance", prompt_view["system_prompt"])
