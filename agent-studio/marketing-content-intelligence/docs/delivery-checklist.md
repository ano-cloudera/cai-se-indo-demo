# Delivery Checklist

## Goal

Roll out the hybrid architecture in a controlled sequence while keeping the existing workflow adapter stable.

## Phase 1: Workflow Adapter Hardening

Service:

- `agent-studio/marketing-content-intelligence`

Checklist:

- `GET /health` returns expected liveness data
- `GET /ready` returns expected readiness data
- `POST /workflow/full-run/json` is the preferred structured contract
- metadata fields are propagated in the normalized response
- `workflow_profile` and `requested_outputs` are accepted and echoed back
- unit tests pass

Verification:

- run `./.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v`
- run `python3 -m compileall app tests`

## Phase 2: Qwen Serving Application

Service:

- `agent-studio/marketing-content-intelligence/cai-qwen-serving`

Checklist:

- `app.py` is the CAI application entrypoint
- `QWEN_MODEL` is configured to the intended target profile
- serving port resolves correctly from `VLLM_PORT`, `PORT`, or `CDSW_APP_PORT`
- `VLLM_SERVED_MODEL_NAME` is defined
- CAI runtime has GPU access
- model cache path is configured if needed
- vLLM starts successfully through the Python launcher
- recommended target for current plan is `2 L4 GPU`
- default target model is `Qwen/Qwen3.6-35B-A3B-FP8`
- fallback model is `Qwen/Qwen3.5-9B` if startup, VRAM, or latency is too heavy

Verification:

- run `python3 -m compileall cai-qwen-serving`
- start with `python cai-qwen-serving/app.py`
- call `GET /v1/models`
- call `POST /v1/chat/completions`
- optionally run `python cai-qwen-serving/sample_chat_request.py`

## Phase 3: Open WebUI Direct Chat

Checklist:

- Open WebUI points to the CAI application base URL for Qwen serving
- configured model name matches `VLLM_SERVED_MODEL_NAME`
- API key is configured if vLLM auth is enabled
- direct chat works for general prompts

Verification:

- open a chat in Open WebUI
- verify direct response from Qwen
- test a simple rewrite or summarization prompt

## Phase 4: Open WebUI Structured Workflow Invocation

Checklist:

- Open WebUI invokes `POST /workflow/full-run/json` for structured tasks
- request includes `metadata.source=open_webui`
- request uses `interaction_mode=structured_workflow` or `hybrid_escalation`
- request includes `workflow_profile` and `requested_outputs` where useful
- response fields used by UI are mapped clearly

Verification:

- submit a structured content request
- confirm normalized response is rendered correctly
- confirm partial response handling and final response handling

## Phase 5: Hybrid Routing

Checklist:

- chat-first flow stays on Qwen by default
- escalation to workflow adapter is explicit and narrow
- UI does not absorb workflow business logic
- artifact handling is available when export succeeds

Verification:

- test a request that starts conversationally and escalates to workflow
- confirm returned content includes normalized structured fields
- confirm export artifact path is reachable when PDF is generated

## Phase 6: Guardrails

Checklist:

- keep Guardrails lightweight in the current critical path initially
- `app/guardrails/service.py` is the primary integration point
- Guardrails AI Hub token is configured if Hub installs are needed
- Hub validators are installed locally before runtime
- embedded validation runs without breaking workflow completion when validators are unavailable
- define input and output validation insertion points
- confirm schema validation targets for adapter response and model response

Verification:

- run `python3 -m compileall app tests`
- run `./.venv/bin/python -m unittest discover -s tests -p 'test_*.py' -v`
- confirm diagnostics expose `guardrails_applied` and `guardrails_issues`

## Phase 7: Ray

Checklist:

- introduce only after serving is stable
- define whether Ray is used for serving, routing, or orchestration
- avoid premature coupling to the workflow adapter

## Environment Summary

Workflow adapter:

- `WORKFLOW_BASE_URL`
- `WORKFLOW_API_KEY`
- `GUARDRAILS_ENABLED`
- `GUARDRAILS_HUB_TOKEN`
- `GUARDRAILS_TOXIC_LANGUAGE_THRESHOLD`
- `GUARDRAILS_PII_ENTITIES`

Deployment note:

- in CAI / CML, set these as runtime environment variables in the application or session configuration
- keep `.env` only as a local development fallback

Qwen serving:

- `QWEN_MODEL`
- `VLLM_SERVED_MODEL_NAME`
- `VLLM_PORT`
- `VLLM_GPU_MEMORY_UTILIZATION`
- `VLLM_TENSOR_PARALLEL_SIZE`
- `VLLM_MAX_MODEL_LEN`
- `HF_HOME`
- `VLLM_API_KEY`

## Decision Gate Before Moving Forward

Only move to Guardrails and Ray after these are true:

- workflow adapter contract is stable
- Qwen serving runs reliably in CAI
- Open WebUI can use direct chat successfully
- Open WebUI can invoke structured workflow successfully
