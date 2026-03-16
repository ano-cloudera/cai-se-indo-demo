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
