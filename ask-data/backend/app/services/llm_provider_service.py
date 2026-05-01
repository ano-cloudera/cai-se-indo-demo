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
        if provider == "azure":
            opt = self._azure_option()
            if opt is None:
                return LLMSelectionState(
                    provider=self.default_provider(),
                    model_id=None,
                    model_name=None,
                )
            return LLMSelectionState(
                provider="azure",
                model_id=opt.model_id,
                model_name=opt.model_name,
            )

        catalog = self.settings.bedrock_model_catalog_entries
        requested_mid = (
            session_memory.llm_selection.model_id.strip()
            if session_memory is not None and session_memory.llm_selection.model_id
            else None
        )
        if requested_mid:
            for mid, mname in catalog:
                if mid == requested_mid:
                    return LLMSelectionState(
                        provider="bedrock",
                        model_id=mid,
                        model_name=mname,
                    )

        default_id = self.settings.bedrock_model_id
        for mid, mname in catalog:
            if mid == default_id:
                return LLMSelectionState(
                    provider="bedrock",
                    model_id=mid,
                    model_name=mname,
                )

        mid0, mname0 = catalog[0]
        return LLMSelectionState(
            provider="bedrock",
            model_id=mid0,
            model_name=mname0,
        )

    def apply_selection(
        self,
        session_memory: SessionMemoryState,
        provider: str,
        model_id: str | None = None,
    ) -> SessionMemoryState:
        snapshot = session_memory.model_copy(deep=True)
        normalized_provider = self._normalize_provider(provider)
        if normalized_provider == "azure":
            snapshot.llm_selection = LLMSelectionState(provider="azure")
        else:
            cleaned = model_id.strip() if isinstance(model_id, str) and model_id.strip() else None
            snapshot.llm_selection = LLMSelectionState(
                provider="bedrock",
                model_id=cleaned,
                model_name=None,
            )
        resolved = self.resolve_selection(snapshot)
        snapshot.llm_selection = resolved
        return snapshot

    def bedrock_catalog_ids(self) -> set[str]:
        return {mid for mid, _ in self.settings.bedrock_model_catalog_entries}

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

    def _azure_option(self) -> LLMProviderOption | None:
        if not self.settings.is_azure_openai_configured:
            return None
        return LLMProviderOption(
            provider="azure",
            label="Azure OpenAI",
            model_id=self.settings.azure_openai_deployment,
            model_name=self.settings.azure_openai_model,
            description="Current default provider for SQL, answers, and general conversation.",
        )

    def _build_options(self) -> list[LLMProviderOption]:
        options: list[LLMProviderOption] = []
        azure_opt = self._azure_option()
        if azure_opt is not None:
            options.append(azure_opt)
        if self.settings.is_bedrock_configured:
            for mid, mname in self.settings.bedrock_model_catalog_entries:
                options.append(
                    LLMProviderOption(
                        provider="bedrock",
                        label="Amazon Bedrock",
                        model_id=mid,
                        model_name=mname,
                        description="Configured Bedrock model for non-RAG chat and SQL generation.",
                    )
                )
        return options
