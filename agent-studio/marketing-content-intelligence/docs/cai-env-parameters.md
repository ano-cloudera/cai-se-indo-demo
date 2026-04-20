# CAI Environment Parameters

## Goal

This guide lists the runtime environment variables to configure in Cloudera AI / CML for the current architecture.

Use CAI / CML application or session environment settings as the source of truth.

Do not rely on `.env` files in production.

## 1. Marketing Content Intelligence

Service path:

- `agent-studio/marketing-content-intelligence`

Recommended CAI application entrypoint:

- `app/main.py` or your selected FastAPI startup command

### Required Parameters

- `WORKFLOW_BASE_URL`
- `WORKFLOW_API_KEY`

### Recommended App Parameters

- `APP_NAME=Content Intelligence API`
- `APP_ENV=prod`
- `APP_DEBUG=false`
- `APP_HOST=0.0.0.0`
- `APP_PORT=8000`

### Workflow Runtime Parameters

- `WORKFLOW_BASE_URL=https://<your-agent-studio-workflow-url>`
- `WORKFLOW_API_KEY=<your-agent-studio-workflow-api-key>`
- `REQUEST_TIMEOUT_SECONDS=120`
- `POLLING_INTERVAL_SECONDS=3`
- `MAX_POLLING_ATTEMPTS=40`

### Guardrails Hub Parameters

- `GUARDRAILS_ENABLED=true`
- `GUARDRAILS_HUB_TOKEN=<your-guardrails-hub-token>`
- `GUARDRAILS_TOXIC_LANGUAGE_ENABLED=true`
- `GUARDRAILS_TOXIC_LANGUAGE_THRESHOLD=0.5`
- `GUARDRAILS_PII_ENABLED=true`
- `GUARDRAILS_PII_ENTITIES=EMAIL_ADDRESS,PHONE_NUMBER,PERSON`

### Minimum Recommended Set

```text
APP_ENV=prod
APP_DEBUG=false
APP_HOST=0.0.0.0
APP_PORT=8000
WORKFLOW_BASE_URL=https://<workflow-url>
WORKFLOW_API_KEY=<workflow-api-key>
GUARDRAILS_ENABLED=true
GUARDRAILS_HUB_TOKEN=<guardrails-token>
GUARDRAILS_TOXIC_LANGUAGE_ENABLED=true
GUARDRAILS_TOXIC_LANGUAGE_THRESHOLD=0.5
GUARDRAILS_PII_ENABLED=true
GUARDRAILS_PII_ENTITIES=EMAIL_ADDRESS,PHONE_NUMBER,PERSON
```

## 2. Qwen Serving Application

Service path:

- `agent-studio/marketing-content-intelligence/cai-qwen-serving`

Recommended CAI application entrypoint:

- `app.py`

### Required Parameters

- `QWEN_MODEL`
- `VLLM_SERVED_MODEL_NAME`

### Recommended Parameters For `2 L4 GPU`

- `QWEN_MODEL=Qwen/Qwen3.6-35B-A3B-FP8`
- `VLLM_SERVED_MODEL_NAME=qwen3.6-35b-a3b-fp8`
- `VLLM_PORT=8000`
- `VLLM_HOST=0.0.0.0`
- `VLLM_DTYPE=auto`
- `VLLM_GPU_MEMORY_UTILIZATION=0.9`
- `VLLM_MAX_MODEL_LEN=32768`
- `VLLM_TENSOR_PARALLEL_SIZE=2`
- `VLLM_MAX_NUM_SEQS=8`
- `VLLM_TRUST_REMOTE_CODE=true`
- `VLLM_ENABLE_CHUNKED_PREFILL=false`
- `VLLM_MAX_LOG_LEN=200`
- `HF_HOME=/home/cdsw/.cache/huggingface`
- `VLLM_API_KEY=<optional-openai-compatible-key>`
- `VLLM_EXTRA_ARGS=`

### Fallback Parameters If The Model Is Too Heavy

- `QWEN_MODEL=Qwen/Qwen3.5-9B`
- `VLLM_SERVED_MODEL_NAME=qwen3.5-9b`
- `VLLM_TENSOR_PARALLEL_SIZE=1`
- `VLLM_MAX_MODEL_LEN=8192`

### Minimum Recommended Set

```text
QWEN_MODEL=Qwen/Qwen3.6-35B-A3B-FP8
VLLM_SERVED_MODEL_NAME=qwen3.6-35b-a3b-fp8
VLLM_PORT=8000
VLLM_HOST=0.0.0.0
VLLM_DTYPE=auto
VLLM_GPU_MEMORY_UTILIZATION=0.9
VLLM_MAX_MODEL_LEN=32768
VLLM_TENSOR_PARALLEL_SIZE=2
VLLM_MAX_NUM_SEQS=8
VLLM_TRUST_REMOTE_CODE=true
HF_HOME=/home/cdsw/.cache/huggingface
```

## 3. Optional Prototype Guardrails App

Service path:

- `agent-studio/marketing-content-intelligence/cai-guardrails`

Current recommendation:

- do not deploy this as the primary Guardrails path
- use embedded Guardrails Hub inside `app/guardrails/` instead

If you still want to run it as a prototype:

- `PORT=8001`
- `CDSW_APP_PORT=8001`

## 4. Deployment Notes

- in CAI / CML, set env vars in the application configuration UI
- runtime env vars override local `.env` files
- keep real secrets out of git
- install Guardrails Hub validators in the runtime if `GUARDRAILS_ENABLED=true`

## 5. Suggested Naming In CAI UI

For the workflow adapter app:

- `marketing-content-intelligence-api`

For the model serving app:

- `marketing-content-intelligence-qwen-serving`
