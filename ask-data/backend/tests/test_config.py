import unittest

from app.core.config import Settings


class SettingsTestCase(unittest.TestCase):
    def test_settings_accept_explicit_values(self) -> None:
        settings = Settings(
            APP_ENV="test",
            APP_HOST="127.0.0.1",
            APP_PORT=9000,
            APP_DEBUG=True,
            IMPALA_HOST="example-host",
            IMPALA_PORT=443,
            IMPALA_HTTP_PATH="cliservice",
            IMPALA_DB="default",
            IMPALA_USER="demo-user",
            IMPALA_PASSWORD="demo-password",
        )

        self.assertEqual(settings.app_env, "test")
        self.assertEqual(settings.impala_db, "default")
        self.assertTrue(settings.is_impala_configured)

    def test_guardrails_flag_requires_api_key(self) -> None:
        settings = Settings(
            GUARDRAILS_ENABLED=True,
            GUARDRAILS_API_KEY="demo-key",
        )

        self.assertTrue(settings.is_guardrails_configured)
        self.assertEqual(settings.guardrails_mode, "local-only")

    def test_guardrails_remote_mode_when_base_url_exists(self) -> None:
        settings = Settings(
            GUARDRAILS_ENABLED=True,
            GUARDRAILS_API_KEY="demo-key",
            GUARDRAILS_BASE_URL="https://guardrails.example.com",
        )

        self.assertEqual(settings.guardrails_mode, "remote")

    def test_bedrock_is_configured_when_region_and_model_exist(self) -> None:
        settings = Settings(
            BEDROCK_REGION="us-west-2",
            BEDROCK_MODEL_ID="anthropic.claude-sonnet-4-20250514-v1:0",
        )

        self.assertTrue(settings.is_bedrock_configured)
