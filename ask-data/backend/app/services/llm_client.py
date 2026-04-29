from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Protocol

import boto3
from openai import AzureOpenAI

from app.core.config import Settings, get_settings


class LLMClientError(RuntimeError):
    """Raised when configured LLM interaction fails."""


class ChatLLMClient(Protocol):
    def chat(self, messages: list[dict[str, str]], temperature: float = 0.0) -> str: ...


@dataclass
class LLMDescriptor:
    provider: str
    model: str
    deployment: str


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


class BedrockClient:
    def __init__(self, settings: Settings | None = None, model_id: str | None = None) -> None:
        self.settings = settings or get_settings()
        self.model_id = model_id or self.settings.bedrock_model_id
        if not self.settings.is_bedrock_configured:
            raise LLMClientError(
                "Bedrock environment variables are incomplete. "
                "Set AWS_DEFAULT_REGION or BEDROCK_REGION and BEDROCK_MODEL_ID."
            )

        client_kwargs: dict[str, Any] = {
            "service_name": "bedrock-runtime",
            "region_name": self.settings.bedrock_region,
        }
        if self.settings.aws_access_key_id.strip() and self.settings.aws_secret_access_key.strip():
            client_kwargs["aws_access_key_id"] = self.settings.aws_access_key_id
            client_kwargs["aws_secret_access_key"] = self.settings.aws_secret_access_key

        self._client = boto3.client(**client_kwargs)

    def chat(self, messages: list[dict[str, str]], temperature: float = 0.0) -> str:
        system_messages, conversation_messages = self._to_bedrock_messages(messages)
        try:
            response = self._client.converse(
                modelId=self.model_id,
                messages=conversation_messages,
                system=system_messages,
                inferenceConfig={"temperature": temperature},
            )
        except Exception as exc:
            raise LLMClientError(f"Bedrock request failed: {exc}") from exc

        output = response.get("output", {})
        message = output.get("message", {})
        content = self._extract_bedrock_text(message.get("content", []))
        if not content:
            raise LLMClientError("Bedrock returned an empty response.")
        return content.strip()

    @staticmethod
    def _to_bedrock_messages(
        messages: list[dict[str, str]],
    ) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
        system_messages: list[dict[str, str]] = []
        conversation_messages: list[dict[str, Any]] = []
        for message in messages:
            role = message.get("role", "user")
            content = message.get("content", "")
            if role == "system":
                system_messages.append({"text": content})
                continue
            if role not in {"user", "assistant"}:
                role = "user"
            conversation_messages.append(
                {
                    "role": role,
                    "content": [{"text": content}],
                }
            )
        return system_messages, conversation_messages

    @staticmethod
    def _extract_bedrock_text(content: list[dict[str, Any]]) -> str:
        parts: list[str] = []
        for item in content:
            text = item.get("text")
            if isinstance(text, str):
                parts.append(text)
        return "\n".join(part for part in parts if part)
