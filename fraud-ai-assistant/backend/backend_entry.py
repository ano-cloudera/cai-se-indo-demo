import logging
import os
import subprocess
import sys
from pathlib import Path


def resolve_port() -> int:
    raw_port = os.getenv("CDSW_APP_PORT") or os.getenv("PORT") or "8080"
    try:
        return int(raw_port)
    except ValueError:
        return 8080


def resolve_backend_dir() -> Path:
    cwd = Path.cwd()

    try:
        script_dir = Path(__file__).resolve().parent
    except NameError:
        script_dir = None

    candidates = []

    if script_dir is not None:
        candidates.append(script_dir)

    candidates += [
        cwd / "fraud-ai-assistant" / "backend",
        cwd / "backend",
    ]

    candidates.append(cwd)

    for candidate in candidates:
        if (candidate / "app").exists():
            return candidate

    return script_dir if script_dir is not None else cwd


def main() -> None:
    backend_dir = resolve_backend_dir()
    port = resolve_port()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    logging.info("Starting Fraud AI Assistant backend")
    logging.info("Working directory: %s", Path.cwd())
    logging.info("Resolved backend dir: %s", backend_dir)
    logging.info("Port: %s", port)

    env = os.environ.copy()
    pythonpath = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = f"{backend_dir}:{pythonpath}" if pythonpath else str(backend_dir)

    cmd = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        str(port),
        "--log-level",
        "info",
    ]

    logging.info("Launching command: %s", " ".join(cmd))

    process = subprocess.Popen(
        cmd,
        cwd=str(backend_dir),
        env=env,
    )
    process.wait()

    raise SystemExit(process.returncode)


if __name__ == "__main__":
    main()
