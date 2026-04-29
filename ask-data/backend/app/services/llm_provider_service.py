from __future__ import annotations

from app.core.config import Settings, get_settings
from app.schemas.llm import (
    LLMProviderOption,
    LLMProviderOptionsResponse,
    LLMSelectionState,
)
from app.schemas.session import SessionMemoryState


class LLMProviderService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()

    def list_options(
        self,
        session_id: str | None = None,
        session_memory: SessionMemoryState | None = None,
    ) -> LLMProviderOptionsResponse:
        selection = self.resolve_selection(session_memory)
        return LLMProviderOptionsResponse(
            session_id=session_id,
            active_provider=selection.provider,
            active_model_id=selection.model_id,
            active_model_name=selection.model_name,
            options=self._build_options(),
        )

    def resolve_selection(
        self,
        session_memory: SessionMemoryState | None = None,
    ) -> LLMSelectionState:
        requested_provider = (
            session_memory.llm_selection.provider if session_memory is not None else None
        )
        provider = self._normalize_provider(requested_provider)
        option = self._option_by_provider(provider)
        return LLMSelectionState(
            provider=provider,
            model_id=option.model_id if option is not None else None,
            model_name=option.model_name if option is not None else None,
        )

    def apply_selection(
        self,
        session_memory: SessionMemoryState,
        provider: str,
    ) -> SessionMemoryState:
        snapshot = session_memory.model_copy(deep=True)
        snapshot.llm_selection = LLMSelectionState(provider=provider)
        normalized = self.resolve_selection(snapshot)
        session_memory.llm_selection = normalized
        return session_memory

    def default_provider(self) -> str:
        if self.settings.is_azure_openai_configured:
            return "azure"
        if self.settings.is_bedrock_configured:
            return "bedrock"
        return "azure"

    def _normalize_provider(self, provider: str | None) -> str:
        candidate = (provider or "").strip().lower()
        if candidate == "bedrock" and self.settings.is_bedrock_configured:
            return "bedrock"
        if candidate == "azure" and self.settings.is_azure_openai_configured:
            return "azure"
        return self.default_provider()

    def _build_options(self) -> list[LLMProviderOption]:
        options: list[LLMProviderOption] = []
        if self.settings.is_azure_openai_configured:
            options.append(
                LLMProviderOption(
                    provider="azure",
                    label="Azure OpenAI",
                    model_id=self.settings.azure_openai_deployment,
                    model_name=self.settings.azure_openai_model,
                    description="Current default provider for SQL, answers, and general conversation.",
                )
            )
        if self.settings.is_bedrock_configured:
            options.append(
                LLMProviderOption(
                    provider="bedrock",
                    label="Amazon Bedrock",
                    model_id=self.settings.bedrock_model_id,
                    model_name=self.settings.bedrock_model_name,
                    description="Alternative provider for the same non-RAG chat and SQL generation flow.",
                )
            )
        return options

    def _option_by_provider(self, provider: str) -> LLMProviderOption | None:
        return next((option for option in self._build_options() if option.provider == provider), None)
