from __future__ import annotations

import json
from typing import Any

from app.core.config import Settings, get_settings


class BedrockServiceError(Exception):
    pass


class BedrockService:
    def __init__(self, settings: Settings | None = None, client: Any | None = None) -> None:
        self.settings = settings or get_settings()
        self.model_id = (self.settings.bedrock_model_id or "").strip()
        self._client = client

    def generate_json_text(self, prompt: str) -> str:
        response_body = self._invoke_model(prompt)
        text = self._extract_text(response_body)
        if not text.strip():
            raise BedrockServiceError("Bedrock returned an empty response.")
        return text

    def _invoke_model(self, prompt: str) -> dict[str, Any]:
        client = self._get_client()
        request_body = self._build_request_body(prompt)

        try:
            response = client.invoke_model(
                modelId=self.model_id,
                body=json.dumps(request_body),
                contentType="application/json",
                accept="application/json",
            )
        except Exception as exc:
            raise BedrockServiceError(f"Bedrock invocation failed: {exc}") from exc

        try:
            raw_body = response["body"].read()
            return json.loads(raw_body)
        except Exception as exc:
            raise BedrockServiceError(f"Bedrock returned an unreadable response body: {exc}") from exc

    def _get_client(self) -> Any:
        if self._client is not None:
            return self._client

        if not self.model_id:
            raise BedrockServiceError("BEDROCK_MODEL_ID is not configured.")

        try:
            import boto3
            from botocore.config import Config
        except ImportError as exc:
            raise BedrockServiceError("boto3 is required for Bedrock integration.") from exc

        session_kwargs: dict[str, Any] = {}
        if self.settings.aws_default_region:
            session_kwargs["region_name"] = self.settings.aws_default_region
        if self.settings.aws_access_key_id:
            session_kwargs["aws_access_key_id"] = self.settings.aws_access_key_id
        if self.settings.aws_secret_access_key:
            session_kwargs["aws_secret_access_key"] = self.settings.aws_secret_access_key

        try:
            session = boto3.session.Session(**session_kwargs)
            self._client = session.client(
                "bedrock-runtime",
                config=Config(
                    connect_timeout=self.settings.bedrock_timeout_seconds,
                    read_timeout=self.settings.bedrock_timeout_seconds,
                    retries={"max_attempts": 1, "mode": "standard"},
                ),
            )
        except Exception as exc:
            raise BedrockServiceError(f"Failed to initialize Bedrock client: {exc}") from exc

        return self._client

    def _build_request_body(self, prompt: str) -> dict[str, Any]:
        if self.model_id.startswith("anthropic."):
            return {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 500,
                "temperature": 0.2,
                "messages": [
                    {
                        "role": "user",
                        "content": [{"type": "text", "text": prompt}],
                    }
                ],
            }

        if self.model_id.startswith("amazon.nova"):
            return {
                "messages": [
                    {
                        "role": "user",
                        "content": [{"text": prompt}],
                    }
                ],
                "inferenceConfig": {
                    "maxTokens": 500,
                    "temperature": 0.2,
                    "topP": 0.9,
                },
            }

        if self.model_id.startswith("meta.llama"):
            return {
                "prompt": prompt,
                "max_gen_len": 500,
                "temperature": 0.2,
            }

        raise BedrockServiceError(
            f"Unsupported BEDROCK_MODEL_ID '{self.model_id}'. Supported prefixes: anthropic., amazon.nova, meta.llama."
        )

    def _extract_text(self, response_body: dict[str, Any]) -> str:
        if "content" in response_body and isinstance(response_body["content"], list):
            parts = [
                item.get("text", "")
                for item in response_body["content"]
                if isinstance(item, dict)
            ]
            joined = "\n".join(part for part in parts if part)
            if joined:
                return joined

        output = response_body.get("output")
        if isinstance(output, dict):
            message = output.get("message")
            if isinstance(message, dict):
                content = message.get("content", [])
                if isinstance(content, list):
                    parts = [
                        item.get("text", "")
                        for item in content
                        if isinstance(item, dict)
                    ]
                    joined = "\n".join(part for part in parts if part)
                    if joined:
                        return joined

        generation = response_body.get("generation")
        if isinstance(generation, str) and generation.strip():
            return generation

        results = response_body.get("results")
        if isinstance(results, list) and results:
            first = results[0]
            if isinstance(first, dict):
                output_text = first.get("outputText")
                if isinstance(output_text, str) and output_text.strip():
                    return output_text

        return ""
