import logging
import os
import subprocess
import sys
from importlib import metadata
from pathlib import Path


EXPECTED_VERSIONS = {
    "fastapi": "0.127.0",
    "starlette": "0.50.0",
    "uvicorn": "0.30.6",
}


def resolve_port() -> int:
    raw_port = os.getenv("CDSW_APP_PORT") or os.getenv("PORT") or "8080"
    try:
        return int(raw_port)
    except ValueError:
        return 8080


def resolve_backend_dir() -> Path:
    cwd = Path.cwd()

    # Dump env vars and cwd listing to help diagnose path issues in CAI
    cdsw_vars = {k: v for k, v in os.environ.items() if "CDSW" in k or "CML" in k}
    logging.info("CAI env vars: %s", cdsw_vars)

    try:
        top_level = sorted(str(p) for p in cwd.iterdir())
        logging.info("Contents of cwd (%s): %s", cwd, top_level)
    except Exception as exc:
        logging.warning("Could not list cwd: %s", exc)

    candidates: list[Path] = [
        cwd / "cai-se-indo-demo" / "ask-data" / "backend",  # current CAI project folder
        cwd / "ask-data" / "backend",
        cwd / "bni-demo" / "backend",                        # legacy folder name
        cwd / "backend",
    ]

    # Scan one level deep under cwd
    try:
        for entry in sorted(cwd.iterdir()):
            if entry.is_dir():
                candidates.append(entry / "ask-data" / "backend")
                candidates.append(entry / "backend")
    except Exception:
        pass

    logging.info("Checking %d candidates:", len(candidates))
    for c in candidates:
        exists = (c / "app").exists()
        logging.info("  %s -> app/exists=%s", c, exists)
        if exists:
            return c

    logging.error("Could not locate backend dir. cwd=%s", cwd)
    return cwd


def validate_runtime_dependencies() -> None:
    actual_versions: dict[str, str | None] = {}
    mismatches: list[str] = []

    for package_name, expected_version in EXPECTED_VERSIONS.items():
        try:
            actual_version = metadata.version(package_name)
            actual_versions[package_name] = actual_version
            logging.info("%s version: %s", package_name, actual_version)
            if actual_version != expected_version:
                mismatches.append(
                    f"{package_name}=={actual_version} (expected {expected_version})"
                )
        except metadata.PackageNotFoundError:
            actual_versions[package_name] = None
            logging.warning("%s is not installed", package_name)
            mismatches.append(f"{package_name} is not installed (expected {expected_version})")

    if mismatches:
        mismatch_summary = ", ".join(mismatches)
        raise SystemExit(
            "Incompatible Python package versions detected for Ask Data backend: "
            f"{mismatch_summary}. "
            "This usually means the Cloudera AI Application install command is not using "
            "ask-data/backend/requirements.txt. "
            "Set the Application working directory to ask-data/backend and the install command "
            "to 'pip install --upgrade -r requirements.txt', then redeploy."
        )


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    logging.info("Starting Ask Data backend")
    logging.info("Working directory: %s", Path.cwd())
    validate_runtime_dependencies()

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
