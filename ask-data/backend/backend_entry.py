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


def find_app_dir(base: Path) -> Path | None:
    """Return base if it contains an 'app' subdirectory, else None."""
    candidate = base / "app"
    if candidate.exists():
        return base
    return None


def resolve_backend_dir() -> Path:
    cwd = Path.cwd()

    # Attempt 1: __file__ (not always available under JupyterWSG launcher)
    try:
        script_dir = Path(__file__).resolve().parent
        logging.info("script_dir via __file__: %s", script_dir)
    except NameError:
        script_dir = None
        logging.info("__file__ not available in this launcher context")

    # Attempt 2: CAI-specific env vars that hint at the project root
    cdsw_root = os.getenv("CDSW_PROJECT_URL") or os.getenv("CDSW_WORKING_DIR") or ""

    # Build ordered candidate list
    candidates: list[Path] = []

    if script_dir:
        candidates.append(script_dir)

    # cwd-relative — CAI cwd is /home/cdsw, repo is cloned directly there
    candidates += [
        cwd / "ask-data" / "backend",
        cwd / "backend",
        # Some CAI setups place the repo inside a named folder
        cwd / "cai-se-indo-demo" / "ask-data" / "backend",
    ]

    # Scan /home/cdsw tree one level deep for any directory that has ask-data/backend/app
    for entry in sorted(cwd.iterdir()):
        if entry.is_dir():
            candidates.append(entry / "ask-data" / "backend")
            candidates.append(entry / "backend")

    logging.info("Checking %d candidates for backend dir:", len(candidates))
    for c in candidates:
        exists = (c / "app").exists()
        logging.info("  %s  app/exists=%s", c, exists)
        if exists:
            return c

    # Nothing found — return cwd and let uvicorn surface a clear error
    logging.error(
        "Could not locate backend dir with app/ in any candidate. "
        "cwd=%s  CDSW_PROJECT_URL=%s", cwd, cdsw_root
    )
    return script_dir if script_dir else cwd


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    logging.info("Starting Ask Data backend")
    logging.info("Working directory: %s", Path.cwd())

    backend_dir = resolve_backend_dir()
    port = resolve_port()

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
