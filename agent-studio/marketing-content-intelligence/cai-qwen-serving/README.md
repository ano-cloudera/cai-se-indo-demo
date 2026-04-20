# cai-qwen-serving

Private Qwen serving application for Cloudera AI using vLLM's OpenAI-compatible server.

## Purpose

This service is the direct chat backend for:

- Open WebUI
- future internal chat applications
- future tool and app integrations that need OpenAI-compatible inference

This service should remain separate from `agent-studio/marketing-content-intelligence`, which is the structured workflow adapter.

## Responsibilities

- serve Qwen privately inside CAI
- expose an OpenAI-compatible API
- provide a stable model endpoint for Open WebUI
- stay independent from workflow orchestration concerns

## Entry Point

Run:

```bash
python app.py
```

The launcher will exec:

```bash
python -m vllm.entrypoints.openai.api_server ...
```

This is intentionally a Python CAI application entrypoint, not a shell wrapper.

## Environment Variables

Copy from `.env.example` and set at least:

- `QWEN_MODEL`
- `VLLM_SERVED_MODEL_NAME`
- `VLLM_PORT`

Recommended default for `2 L4 GPU`:

- `QWEN_MODEL=Qwen/Qwen3.6-35B-A3B-FP8`
- `VLLM_SERVED_MODEL_NAME=qwen3.6-35b-a3b-fp8`
- `VLLM_TENSOR_PARALLEL_SIZE=2`

Recommended fallback if startup, VRAM, or latency is too heavy:

- `QWEN_MODEL=Qwen/Qwen3.5-9B`
- `VLLM_SERVED_MODEL_NAME=qwen3.5-9b`
- `VLLM_TENSOR_PARALLEL_SIZE=1`

Common options:

- `VLLM_DTYPE`
- `VLLM_GPU_MEMORY_UTILIZATION`
- `VLLM_MAX_MODEL_LEN`
- `VLLM_TENSOR_PARALLEL_SIZE`
- `VLLM_MAX_NUM_SEQS`
- `VLLM_TRUST_REMOTE_CODE`
- `HF_HOME`
- `VLLM_API_KEY`
- `VLLM_EXTRA_ARGS`

## Expected API Surface

The runtime is provided by vLLM, so the primary interface is OpenAI-compatible:

- `GET /health`
- `GET /v1/models`
- `POST /v1/chat/completions`
- `POST /v1/completions`

Exact endpoint behavior depends on the installed vLLM version.

## Example Open WebUI Connection

Use the CAI application URL as the OpenAI-compatible base URL, for example:

```text
https://<cai-app-url>
```

Then configure Open WebUI with:

- base URL: `https://<cai-app-url>`
- model name: value from `VLLM_SERVED_MODEL_NAME`
- API key: value from `VLLM_API_KEY` if enabled

## Example Local Startup

```bash
export QWEN_MODEL=Qwen/Qwen3.6-35B-A3B-FP8
export VLLM_SERVED_MODEL_NAME=qwen3.6-35b-a3b-fp8
export VLLM_PORT=8000
export VLLM_TENSOR_PARALLEL_SIZE=2
python app.py
```

## Example Python Verification

```bash
export OPENAI_BASE_URL=http://127.0.0.1:8000
export OPENAI_MODEL=qwen3.6-35b-a3b-fp8
python sample_chat_request.py
```

## Notes

- Keep this service focused on model serving only.
- Do not move workflow adapter logic into this project.
- Add Guardrails and Ray later as separate layers after serving is stable.
