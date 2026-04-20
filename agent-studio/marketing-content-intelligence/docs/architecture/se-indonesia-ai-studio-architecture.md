# SE Indonesia AI Studio Architecture

## Hybrid CAI Application and Workflow Architecture

## 1. Objective

Build a modular AI architecture on Cloudera AI that preserves the existing Agent Studio workflow while introducing a private LLM serving stack for conversational and future multi-app use cases.

This architecture uses:

- the existing Agent Studio workflow for structured content intelligence
- Qwen as a private LLM served from a dedicated CAI Application
- vLLM as the OpenAI-compatible model serving layer
- Ray as a future scaling and orchestration layer
- Guardrails AI Hub as the embedded validation layer
- Open WebUI as the user-facing chat interface
- FastAPI as the workflow adapter and integration API

## 2. Core Principles

1. Do not replace the current workflow LLM path yet.
2. Keep the existing workflow adapter stable and production-safe.
3. Introduce Qwen as a separate application boundary first.
4. Expose Qwen through an OpenAI-compatible interface using vLLM.
5. Let Open WebUI consume both:
   - direct Qwen chat
   - structured workflow endpoints exposed by FastAPI
6. Add Guardrails only after serving is stable, preferably as an embedded library first.
7. Add Ray only after the Qwen and vLLM serving path is stable and multi-node orchestration is actually needed.

## 3. Main Components

### A. Existing Workflow Adapter

Location:

- `agent-studio/marketing-content-intelligence`

Responsibilities:

- call Agent Studio workflow APIs
- manage session creation, file upload, event polling, and artifact download
- handle local document extraction fallback when workflow file access fails
- normalize workflow outputs into API-ready JSON for frontend and tool integration

Current implementation mapping:

- [app/api/routes.py](/Users/trianonurhikmat/Documents/Works/cloudera/cai-se-indo-demo/agent-studio/marketing-content-intelligence/app/api/routes.py)
- [app/services/workflow_service.py](/Users/trianonurhikmat/Documents/Works/cloudera/cai-se-indo-demo/agent-studio/marketing-content-intelligence/app/services/workflow_service.py)
- [app/services/document_extraction_service.py](/Users/trianonurhikmat/Documents/Works/cloudera/cai-se-indo-demo/agent-studio/marketing-content-intelligence/app/services/document_extraction_service.py)
- [app/clients/workflow_client.py](/Users/trianonurhikmat/Documents/Works/cloudera/cai-se-indo-demo/agent-studio/marketing-content-intelligence/app/clients/workflow_client.py)

Tech:

- FastAPI
- existing Agent Studio workflow APIs
- local extraction fallback for PDF, DOCX, TXT, and Markdown

### B. Qwen Serving Application

Planned application:

- `agent-studio/marketing-content-intelligence/cai-qwen-serving`

Responsibilities:

- serve Qwen privately inside Cloudera AI
- expose an OpenAI-compatible API
- provide the primary model endpoint for Open WebUI
- become the foundation for future custom tools, app integrations, and model routing

Tech:

- Python
- vLLM
- Qwen model
- CAI GPU runtime

### C. Open WebUI

Responsibilities:

- provide the user-facing chat interface
- connect to the Qwen serving application as the primary model backend
- invoke FastAPI workflow endpoints when the user needs structured processing

### D. Guardrails Layer

Primary implementation:

- `agent-studio/marketing-content-intelligence/app/guardrails`

Responsibilities:

- validate prompts and outputs
- detect malformed or unsafe responses
- enforce response schema for structured downstream consumption
- provide monitoring hooks for observability

Tech:

- Guardrails AI Hub validators
- embedded Python integration
- future monitoring pipeline

Note:

- `cai-guardrails/` can remain as a prototype or future standalone worker, but it is not the primary integration path for the current architecture

### E. Ray Layer

Responsibilities:

- provide future scale-out serving
- orchestrate multi-worker execution
- support future multi-model routing
- enable resource-aware scheduling

Tech:

- Ray Serve
- optional future worker topology

## 4. Interaction Flows

### Flow 1: Direct Chat Through Open WebUI

`User -> Open WebUI -> Qwen Application -> vLLM -> Qwen -> Response`

Primary use cases:

- general chat
- rewriting
- brainstorming
- summarization
- lightweight content generation

### Flow 2: Structured Workflow Invocation

`User -> Open WebUI or downstream app -> FastAPI Workflow Adapter -> Agent Studio Workflow -> Response`

Primary use cases:

- article review
- research enrichment
- recommendation flow
- structured drafting
- export-ready content generation

### Flow 3: Hybrid Experience

`User -> Open WebUI -> Qwen Application`

If a request requires structured orchestration:

`Open WebUI -> FastAPI Workflow Adapter -> Agent Studio Workflow -> Response -> Open WebUI`

Primary use cases:

- conversational front door with structured escalation
- assistant chat plus workflow-backed content generation
- mixed-mode enterprise interaction

## 5. Deployment Strategy

### Phase 1

Keep the workflow adapter unchanged and production-safe.

### Phase 2

Deploy Qwen as a separate CAI Application and expose it through vLLM.

### Phase 3

Connect Open WebUI to the Qwen endpoint for direct model chat.

### Phase 4

Expose workflow adapter endpoints cleanly for Open WebUI tool or API integration.

### Phase 5

Add Guardrails AI Hub validators as an embedded validation layer around model and workflow outputs.

### Phase 6

Add Ray for scalability, orchestration, and future multi-service model routing.

## 6. Repository Structure

```text
cai-se-indo-demo/
  agent-studio/
    marketing-content-intelligence/
      app/
      agents/
      tools/
      tests/
      requirements.txt
      cai-qwen-serving/
        app.py
        requirements.txt
        README.md
      app/
        guardrails/
          service.py
      docs/
        architecture/
          se-indonesia-ai-studio-architecture.md
```

## 7. Recommended Integration Contract

To keep boundaries clean, the system should expose two separate interfaces:

### Chat Interface

Owned by `cai-qwen-serving`

- OpenAI-compatible `/v1/chat/completions`
- optional `/v1/models`
- optional health and readiness endpoints

### Structured Workflow Interface

Owned by `agent-studio/marketing-content-intelligence`

- `POST /workflow/full-run`
- `POST /sessions`
- `POST /sessions/{session_id}/files`
- `POST /workflow/run`
- `GET /workflow/{trace_id}/events`
- `GET /sessions/{session_id}/artifacts`
- `GET /sessions/{session_id}/artifacts/download`
- `GET /sessions/{session_id}/artifacts/download-all`

This separation avoids coupling Open WebUI directly to workflow internals and keeps the Qwen chat path independent from structured workflow execution.

## 8. Practical Notes For The Current Codebase

What is already aligned:

- FastAPI adapter boundary already exists
- workflow API client is isolated from route handlers
- normalized response model already exists for frontend or tool consumption
- local extraction fallback already improves workflow resilience for document-based requests

What should be added next:

1. a dedicated `cai-qwen-serving/` app inside `marketing-content-intelligence` for private model serving
2. a stable tool-facing contract for Open WebUI to call `POST /workflow/full-run`
3. explicit request metadata for source, mode, and correlation identifiers
4. health, readiness, and observability conventions across all services
5. an embedded `app/guardrails/` module for Guardrails AI Hub validation with optional future promotion to a standalone worker only if needed

## 9. Non-Goals For Early Phases

- replacing the current workflow orchestration path
- merging workflow execution and model serving into one service
- adding Ray before the serving path is proven stable or before Agent Studio integration actually requires it
- overloading Open WebUI with workflow-specific business logic

## 10. Architectural Decision Summary

The current `marketing-content-intelligence` service should remain the structured workflow adapter.

Qwen serving should be introduced as a separate CAI application with an OpenAI-compatible API.

Open WebUI should sit as the front door and choose between:

- direct chat to Qwen for flexible conversation
- workflow adapter invocation for structured, multi-step content intelligence

Guardrails and Ray should remain phase-based additions, not day-one dependencies.
