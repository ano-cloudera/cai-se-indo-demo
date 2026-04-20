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

    # Most reliable: resolve relative to this script's own location.
    # backend_entry.py lives in ask-data/backend/, so __file__ points there.
    try:
        script_dir = Path(__file__).resolve().parent
    except NameError:
        script_dir = None

    candidates = []

    # 1. Directory containing this script (works when CAI uses absolute script path)
    if script_dir is not None:
        candidates.append(script_dir)

    # 2. Relative to cwd — covers the case where CAI cwd is the repo root
    candidates += [
        cwd / "ask-data" / "backend",
        cwd / "backend",
    ]

    # 3. Last resort: cwd itself
    candidates.append(cwd)

    for candidate in candidates:
        if (candidate / "app").exists():
            return candidate

    # If none matched, return script_dir or cwd and let uvicorn surface the real error
    return script_dir if script_dir is not None else cwd


def main() -> None:
    backend_dir = resolve_backend_dir()
    port = resolve_port()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    logging.info("Starting Ask Data backend")
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
