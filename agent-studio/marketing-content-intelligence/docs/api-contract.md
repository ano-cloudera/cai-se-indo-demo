# Marketing Content Intelligence API Contract

## Purpose

This document defines the public adapter contract for `marketing-content-intelligence`.

This service is the structured workflow backend for:

- Open WebUI tool invocation
- downstream applications that need structured content intelligence
- hybrid chat-to-workflow escalation

This service is not a direct LLM serving endpoint.

## Base Responsibility

The adapter owns:

- workflow session creation
- file upload
- workflow kickoff
- event polling
- artifact listing and download
- normalized workflow response generation
- local document extraction fallback

## Recommended Caller Pattern

Use `POST /workflow/full-run/json` for structured JSON invocation.

Use `POST /workflow/full-run` only when file upload is needed in the same request.

## Endpoints

### `GET /health`

Purpose:

- lightweight service liveness check
- runtime summary for deployment and debugging

Example response:

```json
{
  "status": "ok",
  "service": "Content Intelligence API",
  "environment": "dev",
  "workflow_base_url_configured": true,
  "polling": {
    "interval_seconds": 3,
    "max_attempts": 40
  }
}
```

### `GET /ready`

Purpose:

- readiness check for deployment health gates

Example response:

```json
{
  "status": "ready",
  "service": "Content Intelligence API",
  "checks": {
    "workflow_base_url_configured": true,
    "workflow_api_key_configured": true
  }
}
```

### `POST /workflow/full-run/json`

Purpose:

- primary structured execution endpoint for Open WebUI and other JSON callers

Request body:

```json
{
  "user_input": "Review and improve this article draft",
  "context": "B2B campaign for a data platform launch",
  "metadata": {
    "source": "open_webui",
    "interaction_mode": "hybrid_escalation",
    "correlation_id": "chat-123"
  },
  "execution_options": {
    "workflow_profile": "export_ready",
    "requested_outputs": [
      "review_summary",
      "recommendations",
      "drafted_content",
      "pdf_export"
    ]
  }
}
```

Request fields:

- `user_input`: required natural language request
- `context`: optional supporting context
- `metadata.source`: caller source such as `open_webui`, `direct_api`, or `downstream_app`
- `metadata.interaction_mode`: suggested values include `structured_workflow` and `hybrid_escalation`
- `metadata.correlation_id`: optional cross-service trace identifier
- `execution_options.workflow_profile`: high-level execution intent such as `default`, `review_only`, `drafting`, or `export_ready`
- `execution_options.requested_outputs`: optional desired outputs such as `review_summary`, `recommendations`, `drafted_content`, or `pdf_export`

Success response:

```json
{
  "execution": {
    "api_status": "success",
    "workflow_status": "completed",
    "message": "Workflow execution completed",
    "trace_id": "trace-123",
    "session_id": "session-123",
    "session_directory": "/session/path"
  },
  "integration": {
    "source": "open_webui",
    "interaction_mode": "hybrid_escalation",
    "correlation_id": "chat-123",
    "workflow_profile": "export_ready",
    "requested_outputs": [
      "review_summary",
      "recommendations",
      "drafted_content",
      "pdf_export"
    ],
    "adapter_version": "v1"
  },
  "document_processing": {
    "input_mode": "direct_text",
    "upload_attempted": false,
    "upload_succeeded": false,
    "upload_error": null,
    "local_extraction_used": false,
    "local_extraction_method": null,
    "local_extraction_error": null
  },
  "content_result": {
    "review_summary": "...",
    "research_summary": "...",
    "recommendations": [],
    "drafted_content": "...",
    "final_review": null,
    "final_response": "...",
    "partial_response": null,
    "is_partial": false,
    "pdf_export_status": "success",
    "pdf_file_name": "final_article.pdf"
  },
  "diagnostics": {
    "artifact_error": null,
    "raw_event_count": 18,
    "last_known_stage": "export",
    "stage_summary": "last_stage=export; event_count=18; recent_event_types=['task_completed']",
    "guardrails_applied": true,
    "guardrails_issues": [
      "final_response was adjusted by Guardrails."
    ]
  },
  "raw_events": null
}
```

### `POST /workflow/full-run`

Purpose:

- compatibility endpoint for callers that need the normalized full workflow response and optional file upload in one request

Request shape:

- `user_input`: query param
- `context`: query param
- `source`: query param
- `interaction_mode`: query param
- `correlation_id`: query param
- `workflow_profile`: query param
- `requested_outputs`: comma-separated query param
- `file`: optional multipart file

Recommended use:

- browser form flows
- compatibility clients
- mixed file plus workflow execution requests

### `POST /sessions`

Purpose:

- create workflow session explicitly

### `POST /sessions/{session_id}/files`

Purpose:

- upload file into workflow session

### `POST /workflow/run`

Purpose:

- start workflow execution without full normalization flow

### `GET /workflow/{trace_id}/events`

Purpose:

- retrieve workflow events after kickoff

### `GET /sessions/{session_id}/artifacts`

Purpose:

- list generated files for a session

### `GET /sessions/{session_id}/artifacts/download`

Purpose:

- download a single artifact

### `GET /sessions/{session_id}/artifacts/download-all`

Purpose:

- download all session artifacts as zip

## Response Semantics

### `execution`

Operational status of the adapter and workflow run.

Important fields:

- `api_status`
- `workflow_status`
- `trace_id`
- `session_id`
- `session_directory`

### `integration`

Echoes caller intent so downstream systems can correlate responses.

Important fields:

- `source`
- `interaction_mode`
- `correlation_id`
- `workflow_profile`
- `requested_outputs`
- `adapter_version`

### `document_processing`

Reports whether the request used:

- direct text only
- workflow file upload
- local extraction fallback

### `content_result`

Primary structured business payload.

Important fields:

- `review_summary`
- `research_summary`
- `recommendations`
- `drafted_content`
- `final_review`
- `final_response`
- `partial_response`
- `is_partial`
- `pdf_export_status`
- `pdf_file_name`

### `diagnostics`

Adapter-side diagnostics for observability and debugging.

Important fields:

- `artifact_error`
- `raw_event_count`
- `last_known_stage`
- `stage_summary`
- `guardrails_applied`
- `guardrails_issues`

## Error Behavior

When the upstream workflow API fails, the adapter returns:

- HTTP `502`
- `detail` containing the upstream failure description

When file upload fails but local extraction succeeds:

- the adapter continues the flow
- `document_processing.local_extraction_used` becomes `true`
- `document_processing.upload_succeeded` stays `false`

## Stability Guidance

Treat these as stable integration points:

- `GET /health`
- `GET /ready`
- `POST /workflow/full-run/json`
- `WorkflowApiResponse` top-level structure

Future changes should be additive where possible, especially inside:

- `integration`
- `diagnostics`
- `content_result`
