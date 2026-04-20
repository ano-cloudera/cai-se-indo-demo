import logging
import os
import shutil
import subprocess
from pathlib import Path


def resolve_port() -> int:
    raw_port = os.getenv("PORT") or os.getenv("CDSW_APP_PORT") or "3000"
    try:
        return int(raw_port)
    except ValueError:
        return 3000


def resolve_frontend_dir() -> Path:
    cwd = Path.cwd()

    # Most reliable: resolve relative to this script's own location.
    # frontend_entry.py lives in ask-data/frontend/, so __file__ points there.
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
        cwd / "ask-data" / "frontend",
        cwd / "frontend",
    ]

    for candidate in candidates:
        if (candidate / "package.json").exists():
            return candidate

    raise SystemExit(
        f"Could not find frontend directory with package.json. "
        f"script_dir={script_dir}, cwd={cwd}"
    )


def run_command(cmd: list[str], cwd: Path, env: dict[str, str]) -> None:
    logging.info("Running command: %s", " ".join(cmd))
    try:
        subprocess.run(cmd, cwd=str(cwd), env=env, check=True)
    except subprocess.CalledProcessError as exc:
        logging.error("Command failed with exit code %s: %s", exc.returncode, " ".join(cmd))
        raise


def resolve_binary(name: str) -> str:
    direct_match = shutil.which(name)
    if direct_match:
        return direct_match

    candidates = [
        os.getenv("NVM_BIN"),
        os.getenv("NODE_BIN_DIR"),
        str(Path.home() / ".nvm" / "versions" / "node"),
        "/home/cdsw/.nvm/versions/node",
    ]

    for candidate in candidates:
        if not candidate:
            continue

        candidate_path = Path(candidate)
        if candidate_path.is_file() and candidate_path.name == name:
            return str(candidate_path)

        if candidate_path.is_dir():
            direct_bin = candidate_path / name
            if direct_bin.exists():
                return str(direct_bin)

            for nested_bin in sorted(candidate_path.glob(f"*/bin/{name}"), reverse=True):
                if nested_bin.exists():
                    return str(nested_bin)

    raise SystemExit(
        f"Could not find '{name}' in PATH. "
        "Make sure Node.js and npm are available in the CAI runtime."
    )


def main() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )

    frontend_dir = resolve_frontend_dir()
    port = resolve_port()
    api_base_url = os.getenv("NEXT_PUBLIC_API_BASE_URL")

    if not api_base_url:
        raise SystemExit("NEXT_PUBLIC_API_BASE_URL is not set")

    env = os.environ.copy()
    env["PORT"] = str(port)
    env["HOST"] = "127.0.0.1"
    env["HOSTNAME"] = "127.0.0.1"

    npm_bin = resolve_binary("npm")
    node_bin = resolve_binary("node")
    node_bin_dir = str(Path(node_bin).parent)
    env["PATH"] = f"{node_bin_dir}:{env.get('PATH', '')}"

    logging.info("Starting Ask Data frontend")
    logging.info("Working directory: %s", Path.cwd())
    logging.info("Resolved frontend dir: %s", frontend_dir)
    logging.info("Port: %s", port)
    logging.info("NEXT_PUBLIC_API_BASE_URL is configured")
    logging.info("Resolved npm binary: %s", npm_bin)
    logging.info("Resolved node binary: %s", node_bin)

    if not (frontend_dir / "node_modules").exists():
        if (frontend_dir / "package-lock.json").exists():
            run_command([npm_bin, "ci"], cwd=frontend_dir, env=env)
        else:
            run_command([npm_bin, "install"], cwd=frontend_dir, env=env)

    run_command([npm_bin, "run", "build"], cwd=frontend_dir, env=env)

    run_command(
        [
            node_bin,
            "node_modules/next/dist/bin/next",
            "start",
            "--hostname",
            "127.0.0.1",
            "--port",
            str(port),
        ],
        cwd=frontend_dir,
        env=env,
    )


if __name__ == "__main__":
    main()
