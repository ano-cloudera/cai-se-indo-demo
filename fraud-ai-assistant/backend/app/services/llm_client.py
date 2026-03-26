from __future__ import annotations

from typing import Any

from openai import AzureOpenAI

from app.core.config import Settings, get_settings


class LLMClientError(RuntimeError):
    """Raised when Azure OpenAI interaction fails."""


class AzureOpenAIClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        if not self.settings.is_azure_openai_configured:
            raise LLMClientError(
                "Azure OpenAI environment variables are incomplete. "
                "Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, "
                "AZURE_OPENAI_API_VERSION, AZURE_OPENAI_DEPLOYMENT, and AZURE_OPENAI_MODEL."
            )

        self._client = AzureOpenAI(
            api_version=self.settings.azure_openai_api_version,
            azure_endpoint=self.settings.azure_openai_endpoint,
            api_key=self.settings.azure_openai_api_key,
        )

    def chat(self, messages: list[dict[str, str]], temperature: float = 0.0) -> str:
        try:
            response = self._client.chat.completions.create(
                model=self.settings.azure_openai_deployment,
                messages=messages,
                temperature=temperature,
            )
        except Exception as exc:
            raise LLMClientError(f"Azure OpenAI request failed: {exc}") from exc

        if not response.choices:
            raise LLMClientError("Azure OpenAI returned no choices.")

        message = response.choices[0].message
        content = self._extract_text(message.content)
        if not content:
            raise LLMClientError("Azure OpenAI returned an empty response.")
        return content.strip()

    @staticmethod
    def _extract_text(content: Any) -> str:
        if isinstance(content, str):
            return content

        if isinstance(content, list):
            parts: list[str] = []
            for item in content:
                text_value = getattr(item, "text", None)
                if isinstance(text_value, str):
                    parts.append(text_value)
                    continue

                if isinstance(item, dict) and isinstance(item.get("text"), str):
                    parts.append(item["text"])

            return "\n".join(part for part in parts if part)

        return ""
