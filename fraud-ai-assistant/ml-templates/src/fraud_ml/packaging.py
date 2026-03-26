from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _load_run_summaries(runs_root: Path) -> list[dict[str, Any]]:
    summaries: list[dict[str, Any]] = []
    if not runs_root.exists():
        return summaries

    for summary_path in runs_root.glob("*/run_summary.json"):
        payload = json.loads(summary_path.read_text(encoding="utf-8"))
        payload["summary_path"] = str(summary_path)
        summaries.append(payload)
    return summaries


def _resolve_source_run(artifact_root: Path, run_id: str | None) -> dict[str, Any]:
    runs_root = artifact_root / "runs"
    summaries = _load_run_summaries(runs_root)
    if not summaries:
        raise FileNotFoundError(f"No run_summary.json files found under {runs_root}")

    if run_id:
        for summary in summaries:
            if summary.get("mlflow_run_id") == run_id:
                return summary
        raise ValueError(f"Run id not found in local summaries: {run_id}")

    champion_manifest_path = artifact_root / "champion" / "champion_run.json"
    if not champion_manifest_path.exists():
        raise FileNotFoundError("No champion_run.json found. Train models first or pass --run-id.")

    champion_payload = json.loads(champion_manifest_path.read_text(encoding="utf-8"))
    champion_run_id = champion_payload.get("mlflow_run_id")
    for summary in summaries:
        if summary.get("mlflow_run_id") == champion_run_id:
            return summary

    raise ValueError("Champion run metadata exists, but the referenced run artifacts were not found.")


def package_champion_bundle(artifact_root: Path, run_id: str | None = None) -> dict[str, Any]:
    artifact_root = artifact_root.resolve()
    source_run = _resolve_source_run(artifact_root, run_id)
    source_dir = Path(source_run["local_run_dir"]).resolve()
    champion_dir = (artifact_root / "champion").resolve()
    champion_dir.mkdir(parents=True, exist_ok=True)

    copy_map = {
        "pipeline.joblib": "pipeline.joblib",
        "model.joblib": "model.joblib",
        "preprocessor.joblib": "preprocessor.joblib",
        "feature_metadata.json": "feature_metadata.json",
        "training_config.json": "training_config.json",
        "test_metrics.json": "metrics.json",
    }

    for source_name, target_name in copy_map.items():
        shutil.copy2(source_dir / source_name, champion_dir / target_name)

    champion_manifest = {
        "mlflow_run_id": source_run["mlflow_run_id"],
        "model_name": source_run["model_name"],
        "experiment_name": source_run["experiment_name"],
        "local_run_dir": str(source_dir),
        "packaged_at": datetime.now(timezone.utc).isoformat(),
        "primary_metric": source_run["validation_metrics"]["roc_auc"],
        "secondary_metric": source_run["validation_metrics"]["f1"],
    }
    (champion_dir / "champion_run.json").write_text(json.dumps(champion_manifest, indent=2), encoding="utf-8")

    model_version = {
        "model_name": source_run["model_name"],
        "version_label": f"{source_run['model_name']}-{source_run['mlflow_run_id'][:8]}",
        "mlflow_run_id": source_run["mlflow_run_id"],
        "packaged_at": datetime.now(timezone.utc).isoformat(),
        "source_run_dir": str(source_dir),
        "training_data": source_run["training_config"]["data_path"],
    }
    (champion_dir / "model_version.json").write_text(json.dumps(model_version, indent=2), encoding="utf-8")

    return {
        "champion_dir": str(champion_dir),
        "mlflow_run_id": source_run["mlflow_run_id"],
        "model_name": source_run["model_name"],
        "packaged_files": sorted(copy_map.values()) + ["champion_run.json", "model_version.json"],
    }
