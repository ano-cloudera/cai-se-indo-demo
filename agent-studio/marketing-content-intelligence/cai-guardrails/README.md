# cai-guardrails

Guardrails worker for the SE Indonesia AI Studio architecture.

## Purpose

This service is a separate validation layer for:

- Qwen chat requests before they hit the serving endpoint
- Qwen chat responses before they are returned to downstream systems
- normalized workflow adapter responses before they are consumed by UI or other apps

It should remain separate from both:

- `cai-qwen-serving`
- `app/` inside `marketing-content-intelligence`

## Entry Point

Run:

```bash
python app.py
```

This is a Python CAI application entrypoint.

## API Surface

- `GET /health`
- `GET /ready`
- `POST /validate`

## Supported Payload Types

- `qwen_chat_request`
- `qwen_chat_response`
- `workflow_api_response`

## Example Validation Request

```json
{
  "payload_type": "workflow_api_response",
  "payload": {
    "execution": {"workflow_status": "completed"},
    "integration": {"source": "open_webui"},
    "document_processing": {},
    "content_result": {"final_response": "done"},
    "diagnostics": {}
  }
}
```

## Expected Role In Architecture

Recommended insertion points:

1. before forwarding chat requests to `cai-qwen-serving`
2. after receiving chat responses from `cai-qwen-serving`
3. after building normalized responses in `marketing-content-intelligence`

## Notes

- this service currently provides lightweight schema and structure validation
- it is intentionally not in the critical path by default
- policy enforcement and richer validation rules can be layered in later
