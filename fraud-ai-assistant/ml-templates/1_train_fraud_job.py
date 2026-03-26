from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent
SRC_ROOT = PROJECT_ROOT / "src"
CACHE_ROOT = PROJECT_ROOT / ".cache"
CACHE_ROOT.mkdir(parents=True, exist_ok=True)
os.environ.setdefault("MPLCONFIGDIR", str(CACHE_ROOT / "matplotlib"))
os.environ.setdefault("XDG_CACHE_HOME", str(CACHE_ROOT))
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from fraud_ml.config import TemplatePaths, build_training_config
from fraud_ml.train import train_baselines


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Train baseline fraud detection models.")
    parser.add_argument(
        "--data",
        default="../../sample/fraud_transactions.csv",
        help="Path to the fraud transactions CSV.",
    )
    parser.add_argument(
        "--artifact-root",
        default="./artifacts",
        help="Directory for MLflow data, run artifacts, and champion metadata.",
    )
    parser.add_argument(
        "--experiment-name",
        default="fraud_detection_baseline",
        help="MLflow experiment name.",
    )
    parser.add_argument(
        "--random-seed",
        type=int,
        default=42,
        help="Random seed used for deterministic training.",
    )
    return parser


def main() -> None:
    args = build_parser().parse_args()
    paths = TemplatePaths.from_args(PROJECT_ROOT, args.data, args.artifact_root)
    config = build_training_config(
        data_path=paths.data_path,
        artifact_root=paths.artifact_root,
        experiment_name=args.experiment_name,
        random_seed=args.random_seed,
    )
    summary = train_baselines(config)
    print("Fraud model training completed.")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
