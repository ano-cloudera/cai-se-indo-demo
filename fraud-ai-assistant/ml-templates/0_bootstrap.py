from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Bootstrap the fraud ML template.")
    parser.add_argument(
        "--data",
        default="../../sample/fraud_transactions.csv",
        help="Path to the fraud transactions CSV.",
    )
    parser.add_argument(
        "--data-source",
        choices=("impala", "csv"),
        default="impala",
        help="Bootstrap validation source. Use 'impala' in CAI and 'csv' for local fallback.",
    )
    parser.add_argument(
        "--artifact-root",
        default="./artifacts",
        help="Artifact root directory for runs, MLflow data, and champion bundles.",
    )
    parser.add_argument(
        "--skip-install",
        action="store_true",
        help="Skip dependency installation.",
    )
    return parser


def install_requirements(requirements_path: Path) -> None:
    subprocess.run(
        [sys.executable, "-m", "pip", "install", "-r", str(requirements_path)],
        check=True,
    )


def ensure_directories(artifact_root: Path) -> None:
    for relative in ("runs", "champion", "mlruns", "mlflow-artifacts"):
        (artifact_root / relative).mkdir(parents=True, exist_ok=True)


def main() -> None:
    args = build_parser().parse_args()
    project_root = Path(__file__).resolve().parent
    data_path = (project_root / args.data).resolve()
    artifact_root = (project_root / args.artifact_root).resolve()
    requirements_path = project_root / "requirements.txt"

    if not args.skip_install:
        install_requirements(requirements_path)

    if args.data_source == "csv" and not data_path.exists():
        raise FileNotFoundError(f"Fraud dataset not found: {data_path}")

    ensure_directories(artifact_root)

    print("Fraud ML bootstrap completed.")
    print(f"- project root: {project_root}")
    print(f"- data source: {args.data_source}")
    if args.data_source == "impala":
        print(f"- impala host: {os.getenv('IMPALA_HOST', '')}")
        print(f"- impala db: {os.getenv('DB_NAME') or os.getenv('IMPALA_DB') or 'cai_sdx_se_indonesia'}")
        print(f"- source table: {os.getenv('FRAUD_SOURCE_TABLE', 'fraud_transactions')}")
    else:
        print(f"- data path: {data_path}")
    print(f"- artifact root: {artifact_root}")
    print(f"- mlflow tracking root: {artifact_root / 'mlruns'}")
    print(f"- champion bundle directory: {artifact_root / 'champion'}")


if __name__ == "__main__":
    main()
