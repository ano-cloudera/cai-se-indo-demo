# Project State

## Project

Marketing Content Intelligence on Cloudera AI

## Last Updated

- Date: 2026-04-20
- Timezone: Asia/Jakarta

## Primary Goal

Build a hybrid AI architecture for marketing content intelligence that:

- keeps the existing Agent Studio workflow stable
- adds a private Qwen serving path through a CAI Application
- supports Open WebUI and Cloudera Agent Studio through an OpenAI-compatible endpoint
- adds Guardrails AI Hub as an embedded validation layer
- keeps Ray as a future optional scale-out layer, not a current dependency

## Current Architecture Decision

### 1. Structured Workflow Adapter

Path:

- `agent-studio/marketing-content-intelligence/app`

Role:

- primary backend for structured content workflow execution
- session creation, file upload, event polling, artifact access
- normalized response contract for frontend or tool callers

Preferred endpoint:

- `POST /workflow/full-run/json`

### 2. Qwen Serving

Path:

- `agent-studio/marketing-content-intelligence/cai-qwen-serving`

Role:

- dedicated CAI Application for private Qwen model serving
- OpenAI-compatible vLLM endpoint for Open WebUI and Agent Studio

Current target:

- `Qwen/Qwen3.6-35B-A3B-FP8`
- target runtime: `2 L4 GPU`

Fallback model:

- `Qwen/Qwen3.5-9B`

### 3. Guardrails

Primary implementation:

- `agent-studio/marketing-content-intelligence/app/guardrails`

Role:

- embedded Guardrails AI Hub validation
- validates and optionally sanitizes workflow output
- current integration point is inside `workflow_service.py`

Important note:

- `cai-guardrails/` currently exists only as a prototype/reference
- it is not the primary architecture path

### 4. Ray

Status:

- not required yet
- intentionally postponed

Reason:

- current target is to support Agent Studio and Open WebUI through OpenAI-compatible serving first
- no immediate need yet for multi-node orchestration or multi-model routing

## Mini Architecture

### Current Active Shape

```text
User
  |
  +--> Open WebUI / Agent Studio
          |
          +--> cai-qwen-serving
          |      |
          |      +--> vLLM OpenAI-compatible endpoint
          |      +--> Qwen model response
          |
          +--> marketing-content-intelligence/app
                 |
                 +--> Agent Studio workflow APIs
                 +--> document extraction fallback
                 +--> embedded Guardrails AI Hub validation
                 +--> normalized workflow response
```

### Request Flow 1: Direct Model Chat

```text
User
  -> Open WebUI / Agent Studio
  -> cai-qwen-serving
  -> vLLM
  -> Qwen
  -> response back to UI
```

Use for:

- general chat
- rewriting
- brainstorming
- summarization

### Request Flow 2: Structured Workflow

```text
User
  -> Open WebUI / Agent Studio
  -> marketing-content-intelligence/app
  -> Agent Studio workflow
  -> normalized response
  -> response back to UI
```

Use for:

- article review
- research enrichment
- recommendation generation
- structured drafting
- export-ready content generation

### Request Flow 3: Hybrid Escalation

```text
User
  -> Open WebUI / Agent Studio
  -> cai-qwen-serving
  -> conversational intake
  -> marketing-content-intelligence/app
  -> Agent Studio workflow
  -> embedded Guardrails validation
  -> normalized response
  -> response back to UI
```

Use for:

- chat-first experience with structured escalation
- assistant interaction that ends in export-ready content

### Validation Flow

```text
Workflow output
  -> app/guardrails/service.py
  -> Guardrails AI Hub validators
  -> sanitized final_response / drafted_content
  -> diagnostics.guardrails_applied
  -> diagnostics.guardrails_issues
```

## What Has Been Built

### Workflow Adapter

Implemented:

- `GET /health`
- `GET /ready`
- `POST /sessions`
- `POST /sessions/{session_id}/files`
- `POST /workflow/run`
- `GET /workflow/{trace_id}/events`
- `GET /sessions/{session_id}/artifacts`
- `GET /sessions/{session_id}/artifacts/download`
- `GET /sessions/{session_id}/artifacts/download-all`
- `POST /workflow/full-run`
- `POST /workflow/full-run/json`

Features added:

- stable JSON contract for tool-style invocation
- request metadata:
  - `source`
  - `interaction_mode`
  - `correlation_id`
- execution controls:
  - `workflow_profile`
  - `requested_outputs`
- health and readiness endpoints
- local document extraction fallback
- normalized diagnostics fields for frontend integration

### Guardrails Embedded Integration

Implemented:

- `app/guardrails/service.py`
- optional embedded validation for:
  - `final_response`
  - `drafted_content`
- diagnostics fields:
  - `guardrails_applied`
  - `guardrails_issues`

Current behavior:

- if Guardrails is disabled, workflow runs normally
- if Guardrails is enabled but validator install is incomplete, workflow still runs and logs issues
- if Guardrails validators are available, output can be sanitized before response is returned

### Qwen Serving

Implemented:

- Python CAI entrypoint in `cai-qwen-serving/app.py`
- environment-driven vLLM launch
- `sample_chat_request.py`
- deployment notes and model config docs

Current default serving profile:

- `QWEN_MODEL=Qwen/Qwen3.6-35B-A3B-FP8`
- `VLLM_SERVED_MODEL_NAME=qwen3.6-35b-a3b-fp8`
- `VLLM_TENSOR_PARALLEL_SIZE=2`

## Documentation Added

- `docs/architecture/se-indonesia-ai-studio-architecture.md`
- `docs/api-contract.md`
- `docs/open-webui-integration-notes.md`
- `docs/hybrid-integration-roadmap.md`
- `docs/delivery-checklist.md`
- `docs/guardrails-hub-integration.md`
- `docs/cai-env-parameters.md`
- `docs/cai-deployment-guide.md`

## Test Status

Verified:

- unit tests passing
- settings correctly read runtime CAI/CML environment variables
- workflow adapter compile check passing
- qwen serving compile check passing
- embedded guardrails integration covered by tests

## Current Recommended Deployment Order

1. Deploy `marketing-content-intelligence` adapter
2. Configure CAI env vars for workflow and Guardrails
3. Deploy `cai-qwen-serving`
4. Connect Open WebUI or Agent Studio to Qwen endpoint
5. Use workflow adapter for structured tasks
6. Keep Ray for later only if scale or routing requires it

## Copy-Paste CAI / CML Config

### A. Marketing Content Intelligence App

Use these as CAI / CML runtime environment variables:

```text
APP_NAME=Content Intelligence API
APP_ENV=prod
APP_DEBUG=false
APP_HOST=0.0.0.0
APP_PORT=8000
WORKFLOW_BASE_URL=https://<your-agent-studio-workflow-url>
WORKFLOW_API_KEY=<your-agent-studio-workflow-api-key>
GUARDRAILS_ENABLED=true
GUARDRAILS_HUB_TOKEN=<your-guardrails-hub-token>
GUARDRAILS_TOXIC_LANGUAGE_ENABLED=true
GUARDRAILS_TOXIC_LANGUAGE_THRESHOLD=0.5
GUARDRAILS_PII_ENABLED=true
GUARDRAILS_PII_ENTITIES=EMAIL_ADDRESS,PHONE_NUMBER,PERSON
REQUEST_TIMEOUT_SECONDS=120
POLLING_INTERVAL_SECONDS=3
MAX_POLLING_ATTEMPTS=40
```

### B. Qwen Serving App

Use these as CAI / CML runtime environment variables:

```text
QWEN_MODEL=Qwen/Qwen3.6-35B-A3B-FP8
VLLM_SERVED_MODEL_NAME=qwen3.6-35b-a3b-fp8
VLLM_HOST=0.0.0.0
VLLM_PORT=8000
VLLM_DTYPE=auto
VLLM_GPU_MEMORY_UTILIZATION=0.9
VLLM_MAX_MODEL_LEN=32768
VLLM_TENSOR_PARALLEL_SIZE=2
VLLM_MAX_NUM_SEQS=8
VLLM_TRUST_REMOTE_CODE=true
VLLM_ENABLE_CHUNKED_PREFILL=false
VLLM_MAX_LOG_LEN=200
HF_HOME=/home/cdsw/.cache/huggingface
VLLM_API_KEY=
VLLM_EXTRA_ARGS=
```

### C. Fallback Qwen Serving Config

Use this if the default model is too heavy for startup or latency:

```text
QWEN_MODEL=Qwen/Qwen3.5-9B
VLLM_SERVED_MODEL_NAME=qwen3.5-9b
VLLM_HOST=0.0.0.0
VLLM_PORT=8000
VLLM_DTYPE=auto
VLLM_GPU_MEMORY_UTILIZATION=0.9
VLLM_MAX_MODEL_LEN=8192
VLLM_TENSOR_PARALLEL_SIZE=1
VLLM_MAX_NUM_SEQS=16
VLLM_TRUST_REMOTE_CODE=true
VLLM_ENABLE_CHUNKED_PREFILL=false
VLLM_MAX_LOG_LEN=200
HF_HOME=/home/cdsw/.cache/huggingface
VLLM_API_KEY=
VLLM_EXTRA_ARGS=
```

## Important Deployment Notes

- In CAI / CML, runtime environment variables are the source of truth.
- Local `.env` files are development fallback only.
- `.env` under `marketing-content-intelligence` is now ignored by git.
- Do not store real secrets in repo-tracked files.
- If `GUARDRAILS_ENABLED=true`, make sure Guardrails Hub validators are installed in the runtime.

## Guardrails Hub Setup Reminder

Required manual runtime steps:

```bash
pip install guardrails-ai
guardrails configure --token <your_guardrails_hub_token>
guardrails hub install hub://guardrails/guardrails_pii
guardrails hub install hub://guardrails/toxic_language
```

## Recommended Next Step

If another AI continues from here, the next most useful tasks are:

1. prepare final git staging and commit
2. add optional Guardrails validation to `cai-qwen-serving`
3. document Agent Studio registration of the Qwen OpenAI-compatible endpoint
