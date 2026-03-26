from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import joblib
import mlflow
import mlflow.sklearn
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

from fraud_ml.config import MODEL_CANDIDATES, TrainingConfig
from fraud_ml.data import load_dataset
from fraud_ml.evaluate import compute_binary_metrics, save_confusion_matrix, save_roc_curve
from fraud_ml.features import prepare_training_frame
from fraud_ml.mlflow_utils import flatten_metrics, initialize_mlflow, log_json_artifact
from fraud_ml.preprocessing import build_preprocessor


def stratified_chronological_split(
    features: pd.DataFrame,
    target: pd.Series,
    event_timestamp: pd.Series,
    train_fraction: float,
    validation_fraction: float,
) -> dict[str, pd.Index]:
    ordered = pd.DataFrame(
        {
            "row_id": features.index,
            "target": target,
            "event_timestamp": event_timestamp,
        }
    ).sort_values(["event_timestamp", "row_id"]).reset_index(drop=True)

    train_ids: list[int] = []
    validation_ids: list[int] = []
    test_ids: list[int] = []

    for class_value in sorted(ordered["target"].unique()):
        class_rows = ordered[ordered["target"] == class_value]
        class_ids = class_rows["row_id"].tolist()
        train_cutoff = max(1, int(len(class_ids) * train_fraction))
        validation_cutoff = max(train_cutoff + 1, int(len(class_ids) * (train_fraction + validation_fraction)))

        train_ids.extend(class_ids[:train_cutoff])
        validation_ids.extend(class_ids[train_cutoff:validation_cutoff])
        test_ids.extend(class_ids[validation_cutoff:])

    if not train_ids or not validation_ids or not test_ids:
        raise ValueError("Chronological stratified split produced an empty split.")

    return {
        "train": pd.Index(train_ids),
        "validation": pd.Index(validation_ids),
        "test": pd.Index(test_ids),
    }


def build_model(model_name: str, random_seed: int) -> tuple[object, bool]:
    if model_name == "logistic_regression":
        return LogisticRegression(max_iter=1000, solver="liblinear", random_state=random_seed), True
    if model_name == "random_forest":
        return RandomForestClassifier(
            n_estimators=200,
            min_samples_leaf=2,
            n_jobs=-1,
            random_state=random_seed,
        ), False
    raise ValueError(f"Unsupported model candidate: {model_name}")


def _save_run_artifacts(
    run_dir: Path,
    pipeline: Pipeline,
    model_name: str,
    feature_metadata: dict[str, Any],
    preprocessing_metadata: dict[str, Any],
    validation_metrics: dict[str, float],
    test_metrics: dict[str, float],
    training_config: dict[str, Any],
    mlflow_run_id: str,
    experiment_name: str,
) -> dict[str, Any]:
    run_dir.mkdir(parents=True, exist_ok=True)
    charts_dir = run_dir / "charts"
    charts_dir.mkdir(parents=True, exist_ok=True)

    joblib.dump(pipeline, run_dir / "pipeline.joblib")
    joblib.dump(pipeline.named_steps["classifier"], run_dir / "model.joblib")
    joblib.dump(pipeline.named_steps["preprocessor"], run_dir / "preprocessor.joblib")

    feature_metadata_payload = {
        **feature_metadata,
        **preprocessing_metadata,
        "model_name": model_name,
    }
    log_json_artifact(feature_metadata_payload, run_dir / "feature_metadata.json")
    log_json_artifact(validation_metrics, run_dir / "validation_metrics.json")
    log_json_artifact(test_metrics, run_dir / "test_metrics.json")
    log_json_artifact(training_config, run_dir / "training_config.json")

    run_summary = {
        "mlflow_run_id": mlflow_run_id,
        "experiment_name": experiment_name,
        "model_name": model_name,
        "local_run_dir": str(run_dir.resolve()),
        "validation_metrics": validation_metrics,
        "test_metrics": test_metrics,
        "training_config": training_config,
    }
    log_json_artifact(run_summary, run_dir / "run_summary.json")
    return run_summary


def train_baselines(config: TrainingConfig) -> dict[str, Any]:
    config.artifact_root.mkdir(parents=True, exist_ok=True)
    (config.artifact_root / "runs").mkdir(parents=True, exist_ok=True)
    (config.artifact_root / "champion").mkdir(parents=True, exist_ok=True)

    mlflow_state = initialize_mlflow(config.artifact_root, config.experiment_name)
    dataset = load_dataset(config.data_path)
    features, target, feature_metadata = prepare_training_frame(dataset)
    event_timestamp = pd.to_datetime(dataset["transaction_timestamp"], errors="coerce")
    if event_timestamp.isna().all():
        event_timestamp = pd.to_datetime(dataset["transaction_date"], errors="coerce")

    split_indices = stratified_chronological_split(
        features,
        target,
        event_timestamp,
        train_fraction=config.train_fraction,
        validation_fraction=config.validation_fraction,
    )

    train_features = features.loc[split_indices["train"]].copy()
    validation_features = features.loc[split_indices["validation"]].copy()
    test_features = features.loc[split_indices["test"]].copy()
    train_target = target.loc[split_indices["train"]].copy()
    validation_target = target.loc[split_indices["validation"]].copy()
    test_target = target.loc[split_indices["test"]].copy()

    run_summaries: list[dict[str, Any]] = []

    for model_name in MODEL_CANDIDATES:
        model, with_scaling = build_model(model_name, config.random_seed)
        preprocessor, preprocessing_metadata = build_preprocessor(train_features, with_scaling=with_scaling)
        pipeline = Pipeline(
            steps=[
                ("preprocessor", preprocessor),
                ("classifier", model),
            ]
        )

        timestamp_label = datetime.now(timezone.utc).strftime("%Y%m%d%H%M%S")
        local_run_dir = config.artifact_root / "runs" / f"{timestamp_label}_{model_name}"

        with mlflow.start_run(run_name=f"{model_name}_{timestamp_label}") as run:
            pipeline.fit(train_features, train_target)

            validation_probability = pipeline.predict_proba(validation_features)[:, 1]
            test_probability = pipeline.predict_proba(test_features)[:, 1]

            validation_metrics = compute_binary_metrics(validation_target, validation_probability)
            test_metrics = compute_binary_metrics(test_target, test_probability)

            charts_dir = local_run_dir / "charts"
            charts_dir.mkdir(parents=True, exist_ok=True)
            save_confusion_matrix(validation_target, validation_probability, charts_dir / "validation_confusion_matrix.png")
            save_confusion_matrix(test_target, test_probability, charts_dir / "test_confusion_matrix.png")
            save_roc_curve(validation_target, validation_probability, charts_dir / "validation_roc_curve.png")
            save_roc_curve(test_target, test_probability, charts_dir / "test_roc_curve.png")

            training_config = config.as_dict()
            training_config["mlflow_tracking_uri"] = mlflow_state["tracking_uri"]
            training_config["split_sizes"] = {
                "train": len(train_features),
                "validation": len(validation_features),
                "test": len(test_features),
            }

            run_summary = _save_run_artifacts(
                run_dir=local_run_dir,
                pipeline=pipeline,
                model_name=model_name,
                feature_metadata=feature_metadata,
                preprocessing_metadata=preprocessing_metadata,
                validation_metrics=validation_metrics,
                test_metrics=test_metrics,
                training_config=training_config,
                mlflow_run_id=run.info.run_id,
                experiment_name=config.experiment_name,
            )

            mlflow.log_params(
                {
                    "model_name": model_name,
                    "target_column": config.target_column,
                    "primary_metric": config.primary_metric,
                    "secondary_metric": config.secondary_metric,
                    "data_path": str(config.data_path),
                    "with_scaling": with_scaling,
                }
            )
            mlflow.log_metrics(flatten_metrics(validation_metrics, "validation"))
            mlflow.log_metrics(flatten_metrics(test_metrics, "test"))
            mlflow.log_param("feature_count", len(feature_metadata["feature_columns"]))
            mlflow.log_dict(feature_metadata, "feature_metadata.json")
            mlflow.log_artifact(str(local_run_dir / "validation_metrics.json"))
            mlflow.log_artifact(str(local_run_dir / "test_metrics.json"))
            mlflow.log_artifact(str(local_run_dir / "training_config.json"))
            mlflow.log_artifacts(str(charts_dir), artifact_path="charts")
            mlflow.sklearn.log_model(pipeline, artifact_path="model")

            run_summaries.append(run_summary)

    champion = max(
        run_summaries,
        key=lambda summary: (
            summary["validation_metrics"][config.primary_metric],
            summary["validation_metrics"][config.secondary_metric],
        ),
    )

    champion_manifest_path = config.artifact_root / "champion" / "champion_run.json"
    champion_manifest_path.write_text(json.dumps(champion, indent=2), encoding="utf-8")

    return {
        "experiment_name": config.experiment_name,
        "artifact_root": str(config.artifact_root),
        "tracking_uri": mlflow_state["tracking_uri"],
        "run_count": len(run_summaries),
        "champion_model": champion["model_name"],
        "champion_run_id": champion["mlflow_run_id"],
        "champion_validation_metrics": champion["validation_metrics"],
        "champion_test_metrics": champion["test_metrics"],
    }
