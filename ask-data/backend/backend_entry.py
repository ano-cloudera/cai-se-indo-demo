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

    candidates = [
        cwd / "bni-demo" / "backend",
        cwd / "backend",
        cwd,
    ]

    for candidate in candidates:
        if (candidate / "app").exists():
            return candidate

    return cwd


def main() -> None:
    backend_dir = resolve_backend_dir()
    port = resolve_port()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    logging.info("Starting BNI Demo backend")
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