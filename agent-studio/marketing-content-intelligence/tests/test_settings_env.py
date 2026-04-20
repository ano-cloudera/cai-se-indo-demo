import os
import unittest

from app.core.settings import Settings


class SettingsEnvironmentTests(unittest.TestCase):
    def setUp(self) -> None:
        self.original = {
            "WORKFLOW_BASE_URL": os.environ.get("WORKFLOW_BASE_URL"),
            "WORKFLOW_API_KEY": os.environ.get("WORKFLOW_API_KEY"),
            "GUARDRAILS_ENABLED": os.environ.get("GUARDRAILS_ENABLED"),
            "GUARDRAILS_HUB_TOKEN": os.environ.get("GUARDRAILS_HUB_TOKEN"),
        }

    def tearDown(self) -> None:
        for key, value in self.original.items():
            if value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = value

    def test_runtime_environment_variables_override_local_env_file(self) -> None:
        os.environ["WORKFLOW_BASE_URL"] = "https://env-workflow.example"
        os.environ["WORKFLOW_API_KEY"] = "env-workflow-key"
        os.environ["GUARDRAILS_ENABLED"] = "true"
        os.environ["GUARDRAILS_HUB_TOKEN"] = "env-guardrails-token"

        settings = Settings()

        self.assertEqual(settings.workflow_base_url, "https://env-workflow.example")
        self.assertEqual(settings.workflow_api_key, "env-workflow-key")
        self.assertTrue(settings.guardrails_enabled)
        self.assertEqual(settings.guardrails_hub_token, "env-guardrails-token")


if __name__ == "__main__":
    unittest.main()
