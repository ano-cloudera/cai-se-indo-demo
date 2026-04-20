from __future__ import annotations

import logging
import os
import shlex
import sys
from pathlib import Path
from typing import List


def _env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    if value is None or value == "":
        return default
    return value


def _bool_env(name: str, default: bool = False) -> bool:
    value = _env(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _required_env(name: str) -> str:
    value = _env(name)
    if not value:
        raise SystemExit(f"Missing required environment variable: {name}")
    return value


def resolve_port() -> str:
    return (
        _env("VLLM_PORT")
        or _env("PORT")
        or _env("CDSW_APP_PORT")
        or "8000"
    )


def resolve_host() -> str:
    return _env("VLLM_HOST", "0.0.0.0") or "0.0.0.0"


def build_vllm_command() -> List[str]:
    model = _required_env("QWEN_MODEL")
    port = resolve_port()
    host = resolve_host()

    command = [
        sys.executable,
        "-m",
        "vllm.entrypoints.openai.api_server",
        "--model",
        model,
        "--host",
        host,
        "--port",
        port,
        "--served-model-name",
        _env("VLLM_SERVED_MODEL_NAME", model),
    ]

    dtype = _env("VLLM_DTYPE")
    if dtype:
        command.extend(["--dtype", dtype])

    gpu_memory_utilization = _env("VLLM_GPU_MEMORY_UTILIZATION")
    if gpu_memory_utilization:
        command.extend(["--gpu-memory-utilization", gpu_memory_utilization])

    max_model_len = _env("VLLM_MAX_MODEL_LEN")
    if max_model_len:
        command.extend(["--max-model-len", max_model_len])

    tensor_parallel_size = _env("VLLM_TENSOR_PARALLEL_SIZE")
    if tensor_parallel_size:
        command.extend(["--tensor-parallel-size", tensor_parallel_size])

    max_num_seqs = _env("VLLM_MAX_NUM_SEQS")
    if max_num_seqs:
        command.extend(["--max-num-seqs", max_num_seqs])

    download_dir = _env("HF_HOME")
    if download_dir:
        command.extend(["--download-dir", download_dir])

    api_key = _env("VLLM_API_KEY")
    if api_key:
        command.extend(["--api-key", api_key])

    trust_remote_code = _bool_env("VLLM_TRUST_REMOTE_CODE", default=True)
    if trust_remote_code:
        command.append("--trust-remote-code")

    enable_chunked_prefill = _bool_env("VLLM_ENABLE_CHUNKED_PREFILL")
    if enable_chunked_prefill:
        command.append("--enable-chunked-prefill")

    max_log_len = _env("VLLM_MAX_LOG_LEN")
    if max_log_len:
        command.extend(["--max-log-len", max_log_len])

    extra_args = _env("VLLM_EXTRA_ARGS")
    if extra_args:
        command.extend(shlex.split(extra_args))

    return command


def log_startup() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    logging.info("Starting CAI Qwen serving entrypoint")
    logging.info("Working directory: %s", Path.cwd())
    logging.info("Python executable: %s", sys.executable)
    logging.info("Resolved host: %s", resolve_host())
    logging.info("Resolved port: %s", resolve_port())
    logging.info("QWEN_MODEL: %s", _required_env("QWEN_MODEL"))
    logging.info(
        "VLLM_SERVED_MODEL_NAME: %s",
        _env("VLLM_SERVED_MODEL_NAME", _required_env("QWEN_MODEL")),
    )
    logging.info(
        "HF_HOME configured: %s",
        bool(_env("HF_HOME")),
    )
    logging.info(
        "VLLM_API_KEY configured: %s",
        bool(_env("VLLM_API_KEY")),
    )


def main() -> None:
    log_startup()
    command = build_vllm_command()
    logging.info(
        "Executing vLLM server command: %s",
        " ".join(shlex.quote(part) for part in command),
    )
    os.execvp(command[0], command)


if __name__ == "__main__":
    main()
