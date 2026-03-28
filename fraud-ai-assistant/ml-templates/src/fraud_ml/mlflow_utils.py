from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

import mlflow


def initialize_mlflow(artifact_root: Path, experiment_name: str) -> dict[str, str]:
    tracking_mode = os.getenv("MLFLOW_TRACKING_MODE", "auto").strip().lower()
    explicit_tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "").strip()

    tracking_uri = ""
    artifact_store_uri = ""

    if explicit_tracking_uri:
        mlflow.set_tracking_uri(explicit_tracking_uri)
        tracking_uri = explicit_tracking_uri
    elif tracking_mode == "local":
        tracking_dir = (artifact_root / "mlruns").resolve()
        tracking_dir.mkdir(parents=True, exist_ok=True)
        artifact_store = (artifact_root / "mlflow-artifacts" / experiment_name).resolve()
        artifact_store.mkdir(parents=True, exist_ok=True)
        tracking_uri = tracking_dir.as_uri()
        artifact_store_uri = artifact_store.as_uri()
        mlflow.set_tracking_uri(tracking_uri)
    else:
        # In Cloudera AI ML runtimes, leaving the tracking URI unset allows the
        # platform's managed MLflow integration to capture runs in Experiments.
        tracking_uri = mlflow.get_tracking_uri()

    experiment = mlflow.get_experiment_by_name(experiment_name)
    if experiment is None:
        if artifact_store_uri:
            mlflow.create_experiment(experiment_name, artifact_location=artifact_store_uri)
        else:
            mlflow.create_experiment(experiment_name)
    mlflow.set_experiment(experiment_name)

    return {
        "tracking_uri": tracking_uri,
        "artifact_store": artifact_store_uri,
    }


def log_json_artifact(payload: dict[str, Any], output_path: Path) -> None:
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")


def flatten_metrics(metrics: dict[str, float], prefix: str) -> dict[str, float]:
    return {f"{prefix}_{name}": value for name, value in metrics.items()}
