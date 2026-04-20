# Open WebUI Integration Notes

## Goal

Use Open WebUI as the conversational front door while keeping `marketing-content-intelligence` as the structured workflow backend.

## Integration Modes

### Mode 1: Direct Chat

Path:

- `User -> Open WebUI -> Qwen serving endpoint`

Use for:

- general chat
- brainstorming
- rewriting
- summarization
- lightweight content generation

Do not route these requests through `marketing-content-intelligence`.

### Mode 2: Structured Workflow

Path:

- `User -> Open WebUI -> marketing-content-intelligence`

Use for:

- article review
- research enrichment
- recommendation flow
- structured drafting
- export-ready content generation

Recommended endpoint:

- `POST /workflow/full-run/json`

### Mode 3: Hybrid Escalation

Path:

- `User -> Open WebUI -> Qwen serving endpoint`
- Qwen or UI decides the request needs structured orchestration
- `Open WebUI -> marketing-content-intelligence`

Use for:

- conversational intake followed by workflow execution
- assistant chat that needs export-ready structured output
- mixed enterprise interaction with chat first and workflow second

## Recommended Adapter Metadata

For Open WebUI callers:

- `metadata.source = "open_webui"`
- `metadata.correlation_id = <chat id or request id>`

For direct workflow invocation:

- `metadata.interaction_mode = "structured_workflow"`

For chat-triggered escalation:

- `metadata.interaction_mode = "hybrid_escalation"`

## Recommended Execution Profiles

Suggested initial mapping:

- `workflow_profile = "default"`
  Use when the UI only knows the user wants structured processing.

- `workflow_profile = "review_only"`
  Use when the user mainly wants critique and improvement feedback.

- `workflow_profile = "drafting"`
  Use when the user wants structured drafting output.

- `workflow_profile = "export_ready"`
  Use when the user wants draft plus finalization and export artifact.

Suggested `requested_outputs` examples:

- `["review_summary"]`
- `["review_summary", "recommendations"]`
- `["drafted_content"]`
- `["review_summary", "recommendations", "drafted_content", "pdf_export"]`

## Example Request From Open WebUI

```json
{
  "user_input": "Review this announcement and produce an improved export-ready version",
  "context": "Audience is enterprise IT leaders in Indonesia",
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

## UI Handling Guidance

Open WebUI should treat these fields as especially useful:

- `execution.workflow_status`
- `execution.trace_id`
- `content_result.final_response`
- `content_result.partial_response`
- `content_result.is_partial`
- `content_result.pdf_export_status`
- `content_result.pdf_file_name`
- `diagnostics.last_known_stage`

Suggested UI behavior:

- if `is_partial` is `true`, show partial progress content instead of waiting silently
- if `pdf_export_status` is `success`, expose artifact retrieval action
- if `workflow_status` is `running`, keep polling or show in-progress state
- if `workflow_status` is `failed`, surface adapter error details clearly

## Suggested Tool Boundary

Open WebUI should keep the adapter call narrow:

- one tool or backend action for structured workflow execution
- one tool or backend action for artifact retrieval if needed

Avoid embedding workflow-specific business logic directly inside the UI layer.

## Recommended Next Integration Step

After Qwen serving exists, the clean setup is:

1. Open WebUI uses Qwen as the primary chat model.
2. Open WebUI invokes `marketing-content-intelligence` only for structured workflows.
3. The adapter response is rendered as structured content, not raw event payload by default.
