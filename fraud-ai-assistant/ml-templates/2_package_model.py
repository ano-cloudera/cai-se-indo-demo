from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from fraud_ml.config import TemplatePaths
from fraud_ml.packaging import package_champion_bundle


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Package a fraud model champion bundle.")
    parser.add_argument(
        "--artifact-root",
        default="./artifacts",
        help="Directory containing run artifacts and champion metadata.",
    )
    parser.add_argument(
        "--run-id",
        default=None,
        help="Optional MLflow run id to package. If omitted, the selected champion is used.",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    paths = TemplatePaths.from_args(
        project_root=PROJECT_ROOT,
        data_path="../../sample/fraud_transactions.csv",
        artifact_root=args.artifact_root,
    )
    result = package_champion_bundle(paths.artifact_root, run_id=args.run_id)
    print("Fraud champion packaging completed.")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
