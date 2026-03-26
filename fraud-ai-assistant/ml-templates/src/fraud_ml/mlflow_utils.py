from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import mlflow


def initialize_mlflow(artifact_root: Path, experiment_name: str) -> dict[str, str]:
    tracking_dir = (artifact_root / "mlruns").resolve()
    tracking_dir.mkdir(parents=True, exist_ok=True)
    tracking_uri = tracking_dir.as_uri()
    artifact_store = (artifact_root / "mlflow-artifacts" / experiment_name).resolve()
    artifact_store.mkdir(parents=True, exist_ok=True)

    mlflow.set_tracking_uri(tracking_uri)
    experiment = mlflow.get_experiment_by_name(experiment_name)
    if experiment is None:
        mlflow.create_experiment(experiment_name, artifact_location=artifact_store.as_uri())
    mlflow.set_experiment(experiment_name)

    return {
        "tracking_uri": tracking_uri,
        "artifact_store": artifact_store.as_uri(),
    }


def log_json_artifact(payload: dict[str, Any], output_path: Path) -> None:
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def flatten_metrics(metrics: dict[str, float], prefix: str) -> dict[str, float]:
    return {f"{prefix}_{name}": value for name, value in metrics.items()}
