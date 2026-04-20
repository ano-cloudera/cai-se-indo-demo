from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel, Field


def resolve_port() -> int:
    raw_port = os.getenv("PORT") or os.getenv("CDSW_APP_PORT") or "8001"
    try:
        return int(raw_port)
    except ValueError:
        return 8001


class ValidationIssue(BaseModel):
    code: str
    message: str
    severity: str = "error"
    field: Optional[str] = None


class ValidationRequest(BaseModel):
    payload_type: str = Field(
        ...,
        description="Supported values: qwen_chat_request, qwen_chat_response, workflow_api_response",
    )
    payload: Dict[str, Any]


class ValidationResponse(BaseModel):
    valid: bool
    payload_type: str
    issues: List[ValidationIssue] = Field(default_factory=list)


def validate_qwen_chat_request(payload: Dict[str, Any]) -> List[ValidationIssue]:
    issues: List[ValidationIssue] = []

    model = payload.get("model")
    if not isinstance(model, str) or not model.strip():
        issues.append(
            ValidationIssue(
                code="missing_model",
                message="Qwen chat request must include a non-empty model.",
                field="model",
            )
        )

    messages = payload.get("messages")
    if not isinstance(messages, list) or not messages:
        issues.append(
            ValidationIssue(
                code="missing_messages",
                message="Qwen chat request must include a non-empty messages array.",
                field="messages",
            )
        )
    else:
        for index, message in enumerate(messages):
            if not isinstance(message, dict):
                issues.append(
                    ValidationIssue(
                        code="invalid_message",
                        message="Each message must be an object.",
                        field=f"messages[{index}]",
                    )
                )
                continue

            if not isinstance(message.get("role"), str):
                issues.append(
                    ValidationIssue(
                        code="missing_role",
                        message="Each message must include a string role.",
                        field=f"messages[{index}].role",
                    )
                )

            content = message.get("content")
            if not isinstance(content, str) or not content.strip():
                issues.append(
                    ValidationIssue(
                        code="missing_content",
                        message="Each message must include non-empty string content.",
                        field=f"messages[{index}].content",
                    )
                )

    return issues


def validate_qwen_chat_response(payload: Dict[str, Any]) -> List[ValidationIssue]:
    issues: List[ValidationIssue] = []

    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        issues.append(
            ValidationIssue(
                code="missing_choices",
                message="Qwen chat response must include a non-empty choices array.",
                field="choices",
            )
        )
        return issues

    first_choice = choices[0]
    if not isinstance(first_choice, dict):
        issues.append(
            ValidationIssue(
                code="invalid_choice",
                message="Each choice must be an object.",
                field="choices[0]",
            )
        )
        return issues

    message = first_choice.get("message")
    if not isinstance(message, dict):
        issues.append(
            ValidationIssue(
                code="missing_message",
                message="Choice must include a message object.",
                field="choices[0].message",
            )
        )
        return issues

    content = message.get("content")
    if not isinstance(content, str) or not content.strip():
        issues.append(
            ValidationIssue(
                code="missing_assistant_content",
                message="Assistant message content must be a non-empty string.",
                field="choices[0].message.content",
            )
        )

    return issues


def validate_workflow_api_response(payload: Dict[str, Any]) -> List[ValidationIssue]:
    issues: List[ValidationIssue] = []

    required_top_level = [
        "execution",
        "integration",
        "document_processing",
        "content_result",
        "diagnostics",
    ]

    for field_name in required_top_level:
        if not isinstance(payload.get(field_name), dict):
            issues.append(
                ValidationIssue(
                    code=f"missing_{field_name}",
                    message=f"Workflow API response must include object field '{field_name}'.",
                    field=field_name,
                )
            )

    execution = payload.get("execution")
    if isinstance(execution, dict):
        if not isinstance(execution.get("workflow_status"), str):
            issues.append(
                ValidationIssue(
                    code="missing_workflow_status",
                    message="execution.workflow_status must be a string.",
                    field="execution.workflow_status",
                )
            )

    integration = payload.get("integration")
    if isinstance(integration, dict):
        if not isinstance(integration.get("source"), str):
            issues.append(
                ValidationIssue(
                    code="missing_source",
                    message="integration.source must be a string.",
                    field="integration.source",
                )
            )

    content_result = payload.get("content_result")
    if isinstance(content_result, dict):
        final_response = content_result.get("final_response")
        partial_response = content_result.get("partial_response")
        if final_response is None and partial_response is None:
            issues.append(
                ValidationIssue(
                    code="missing_content_payload",
                    message="content_result should include final_response or partial_response.",
                    field="content_result",
                    severity="warning",
                )
            )

    return issues


def validate_payload(payload_type: str, payload: Dict[str, Any]) -> List[ValidationIssue]:
    validators = {
        "qwen_chat_request": validate_qwen_chat_request,
        "qwen_chat_response": validate_qwen_chat_response,
        "workflow_api_response": validate_workflow_api_response,
    }
    validator = validators.get(payload_type)
    if validator is None:
        return [
            ValidationIssue(
                code="unsupported_payload_type",
                message=f"Unsupported payload_type: {payload_type}",
                field="payload_type",
            )
        ]
    return validator(payload)


app = FastAPI(
    title="CAI Guardrails Worker",
    version="0.1.0",
)


@app.get("/health")
async def health() -> Dict[str, Any]:
    return {
        "status": "ok",
        "service": "cai-guardrails",
        "validation_types": [
            "qwen_chat_request",
            "qwen_chat_response",
            "workflow_api_response",
        ],
    }


@app.get("/ready")
async def ready() -> Dict[str, Any]:
    return {
        "status": "ready",
        "service": "cai-guardrails",
    }


@app.post("/validate", response_model=ValidationResponse)
async def validate(request: ValidationRequest) -> ValidationResponse:
    issues = validate_payload(request.payload_type, request.payload)
    return ValidationResponse(
        valid=not any(issue.severity == "error" for issue in issues),
        payload_type=request.payload_type,
        issues=issues,
    )


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
    port = resolve_port()
    logging.info("Starting CAI Guardrails worker on port %s", port)
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
