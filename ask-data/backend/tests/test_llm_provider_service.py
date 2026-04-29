import unittest

from app.core.config import Settings
from app.schemas.llm import LLMSelectionState
from app.schemas.session import SessionMemoryState
from app.services.llm_provider_service import LLMProviderService


class LLMProviderServiceTestCase(unittest.TestCase):
    def test_lists_both_azure_and_bedrock_when_configured(self) -> None:
        settings = Settings(
            AZURE_OPENAI_ENDPOINT="https://example.openai.azure.com/",
            AZURE_OPENAI_API_KEY="demo-key",
            AZURE_OPENAI_API_VERSION="2024-12-01-preview",
            AZURE_OPENAI_DEPLOYMENT="gpt-4-1-demo",
            AZURE_OPENAI_MODEL="gpt-4.1",
            BEDROCK_REGION="us-west-2",
            BEDROCK_MODEL_ID="anthropic.claude-sonnet-4-20250514-v1:0",
            BEDROCK_MODEL_NAME="Claude Sonnet 4",
        )
        service = LLMProviderService(settings=settings)

        options = service.list_options().options

        self.assertEqual([option.provider for option in options], ["azure", "bedrock"])

    def test_resolve_selection_falls_back_to_default_when_invalid(self) -> None:
        settings = Settings(
            AZURE_OPENAI_ENDPOINT="https://example.openai.azure.com/",
            AZURE_OPENAI_API_KEY="demo-key",
            AZURE_OPENAI_API_VERSION="2024-12-01-preview",
            AZURE_OPENAI_DEPLOYMENT="gpt-4-1-demo",
            AZURE_OPENAI_MODEL="gpt-4.1",
        )
        service = LLMProviderService(settings=settings)
        memory = SessionMemoryState(
            session_id="session-1",
            llm_selection=LLMSelectionState(provider="bedrock"),
        )

        selection = service.resolve_selection(memory)

        self.assertEqual(selection.provider, "azure")
        self.assertEqual(selection.model_name, "gpt-4.1")

    def test_apply_selection_persists_bedrock_choice(self) -> None:
        settings = Settings(
            AZURE_OPENAI_ENDPOINT="https://example.openai.azure.com/",
            AZURE_OPENAI_API_KEY="demo-key",
            AZURE_OPENAI_API_VERSION="2024-12-01-preview",
            AZURE_OPENAI_DEPLOYMENT="gpt-4-1-demo",
            AZURE_OPENAI_MODEL="gpt-4.1",
            BEDROCK_REGION="us-west-2",
            BEDROCK_MODEL_ID="anthropic.claude-sonnet-4-20250514-v1:0",
            BEDROCK_MODEL_NAME="Claude Sonnet 4",
        )
        service = LLMProviderService(settings=settings)
        session = SessionMemoryState(session_id="session-1")

        updated = service.apply_selection(session, "bedrock")

        self.assertEqual(updated.llm_selection.provider, "bedrock")
        self.assertEqual(
            updated.llm_selection.model_id,
            "anthropic.claude-sonnet-4-20250514-v1:0",
        )
