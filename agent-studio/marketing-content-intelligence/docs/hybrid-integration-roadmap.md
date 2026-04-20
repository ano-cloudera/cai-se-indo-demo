# Hybrid Integration Roadmap

## Scope

This roadmap keeps `marketing-content-intelligence` as the structured workflow adapter for content intelligence workloads.

It does not turn this service into a model-serving application.

## Current Role Of This Service

The service already owns:

- workflow session creation
- file upload to Agent Studio
- workflow kickoff
- workflow event polling
- artifact listing and download
- local document extraction fallback
- normalized API response for frontend consumption

This makes it the correct integration point for:

- Open WebUI tool invocation
- downstream structured content workflows
- hybrid chat-to-workflow escalation

## Immediate Hardening Goals

### 1. Stable Integration Metadata

The adapter should accept and return caller metadata so downstream systems can trace requests across layers.

Current baseline:

- `source`
- `interaction_mode`
- `correlation_id`

### 2. Health And Readiness Conventions

The adapter should expose:

- `GET /health` for service status and runtime config summary
- `GET /ready` for deployment readiness checks

### 3. Stable Workflow Entry Point

Preferred entry point for Open WebUI integration:

- `POST /workflow/full-run/json`

This endpoint should remain the simplest structured workflow contract for tool-style invocation.

Compatibility endpoint for mixed query plus file upload:

- `POST /workflow/full-run`

## Recommended Open WebUI Usage

### Direct Chat Mode

Use Qwen directly through the future OpenAI-compatible serving endpoint.

Do not route general chat through this adapter.

### Structured Workflow Mode

Call this adapter when the user needs:

- article review
- research enrichment
- recommendation generation
- structured drafting
- export-ready content generation

Suggested metadata:

- `source=open_webui`
- `interaction_mode=structured_workflow`
- `correlation_id=<chat or request id>`

### Hybrid Escalation Mode

When chat determines the request needs workflow orchestration, Open WebUI should call:

- `POST /workflow/full-run/json`

Suggested metadata:

- `source=open_webui`
- `interaction_mode=hybrid_escalation`
- `correlation_id=<chat or request id>`

Suggested JSON payload:

```json
{
  "user_input": "Review and improve this press release draft",
  "context": "B2B campaign for data platform launch",
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

Suggested response shape:

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
    "stage_summary": "last_stage=export; event_count=18; recent_event_types=['task_completed']"
  },
  "raw_events": null
}
```

## Next Changes Inside This Service

1. keep `WorkflowApiResponse` stable as the frontend-facing normalized contract
2. add richer diagnostics only as additive fields
3. embed Guardrails AI Hub as a lightweight library module, not as a separate HTTP dependency in the critical path
4. avoid embedding Qwen or vLLM serving logic into this project
5. add tests around normalization and metadata propagation

## Out Of Scope For This Project

- direct LLM model serving
- vLLM runtime management
- Ray worker orchestration
- Open WebUI frontend code
- Guardrails execution pipeline

## Delivery Sequence

### Phase A

Harden the adapter contract and observability surface.

### Phase B

Connect Open WebUI as a caller to the workflow adapter.

### Phase C

Introduce separate Qwen serving and keep this service as the structured workflow backend.

### Phase D

Insert Guardrails AI Hub validators inside the adapter and later around the serving boundary, while keeping Ray as a later optional scaling layer.
