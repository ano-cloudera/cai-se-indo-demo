# Qwen Serving Deployment Notes

## Runtime Goal

Run vLLM inside a Cloudera AI Application and expose an OpenAI-compatible endpoint for Open WebUI.

## Minimum Inputs

- GPU-enabled CAI runtime
- `QWEN_MODEL`
- adequate model download cache path
- port exposure for the CAI application

## Recommended Initial Settings

- `QWEN_MODEL=Qwen/Qwen3.6-35B-A3B-FP8`
- `VLLM_SERVED_MODEL_NAME=qwen3.6-35b-a3b-fp8`
- `VLLM_PORT=8000`
- `VLLM_GPU_MEMORY_UTILIZATION=0.9`
- `VLLM_TENSOR_PARALLEL_SIZE=2`
- `VLLM_MAX_MODEL_LEN=32768`
- `VLLM_TRUST_REMOTE_CODE=true`

Recommended target profile:

- `2 L4 GPU`

Recommended fallback if startup or latency is too heavy:

- `QWEN_MODEL=Qwen/Qwen3.5-9B`
- `VLLM_SERVED_MODEL_NAME=qwen3.5-9b`
- `VLLM_TENSOR_PARALLEL_SIZE=1`
- `VLLM_MAX_MODEL_LEN=8192`

## Launch Command

```bash
python app.py
```

## Verify After Startup

1. Open `GET /health`
2. Open `GET /v1/models`
3. Send a small `POST /v1/chat/completions` request
4. Connect Open WebUI using the CAI application base URL

## Example Verification Request

```bash
curl http://127.0.0.1:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen3.6-35b-a3b-fp8",
    "messages": [
      {"role": "user", "content": "Say hello in Indonesian."}
    ]
  }'
```

## Boundary Reminder

This service is for model serving only.

Structured workflow execution remains in:

- `agent-studio/marketing-content-intelligence`
