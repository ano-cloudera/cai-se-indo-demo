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

    cdsw_vars = {k: v for k, v in os.environ.items() if "CDSW" in k or "CML" in k}
    logging.info("CAI env vars: %s", cdsw_vars)

    try:
        top_level = sorted(str(path) for path in cwd.iterdir())
        logging.info("Contents of cwd (%s): %s", cwd, top_level)
    except Exception as exc:
        logging.warning("Could not list cwd: %s", exc)

    candidates: list[Path] = [
        cwd / "cai-se-indo-demo" / "healthcare" / "Xray Assistant" / "backend",
        cwd / "healthcare" / "Xray Assistant" / "backend",
        cwd / "Xray Assistant" / "backend",
        cwd / "backend",
    ]

    try:
        for entry in sorted(cwd.iterdir()):
            if entry.is_dir():
                candidates.append(entry / "healthcare" / "Xray Assistant" / "backend")
                candidates.append(entry / "Xray Assistant" / "backend")
                candidates.append(entry / "backend")
    except Exception:
        pass

    logging.info("Checking %d candidates:", len(candidates))
    for candidate in candidates:
        exists = (candidate / "app").exists()
        logging.info("  %s -> app/exists=%s", candidate, exists)
        if exists:
            return candidate

    raise SystemExit(
        f"Could not locate Xray Assist backend directory. cwd={cwd}. Check logs above for candidates."
    )


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    logging.info("Starting Xray Assist backend")
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

    process = subprocess.Popen(cmd, cwd=str(backend_dir), env=env)
    process.wait()

    raise SystemExit(process.returncode)


if __name__ == "__main__":
    main()
