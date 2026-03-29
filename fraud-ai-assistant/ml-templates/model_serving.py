from __future__ import annotations

import json
import sys
import traceback
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import pandas as pd


if "__file__" in globals():
    PROJECT_ROOT = Path(__file__).resolve().parent
else:  # pragma: no cover - used by CAI model runtime execution contexts
    PROJECT_ROOT = Path.cwd()
SRC_ROOT = PROJECT_ROOT / "src"
if str(SRC_ROOT) not in sys.path:
    sys.path.insert(0, str(SRC_ROOT))

from fraud_ml.features import prepare_inference_features

try:
    import cml.models_v1 as models  # type: ignore
except ImportError:  # pragma: no cover
    models = None


def _identity_decorator(function):
    return function


def _model_decorator():
    if models is None:
        return _identity_decorator
    return models.cml_model(metrics=False)


@lru_cache(maxsize=1)
def _load_bundle() -> tuple[Any, dict[str, Any]]:
    candidate_dirs = [
        PROJECT_ROOT / "deployment_artifacts" / "champion",
        PROJECT_ROOT / "artifacts" / "champion",
    ]

    last_missing: FileNotFoundError | None = None
    for champion_dir in candidate_dirs:
        pipeline_path = champion_dir / "pipeline.joblib"
        metadata_path = champion_dir / "feature_metadata.json"
        if pipeline_path.exists() and metadata_path.exists():
            pipeline = joblib.load(pipeline_path)
            metadata = json.loads(metadata_path.read_text(encoding="utf-8"))
            return pipeline, metadata
        last_missing = FileNotFoundError(
            f"Champion bundle not found in {champion_dir}. "
            "Expected pipeline.joblib and feature_metadata.json."
        )

    if last_missing is not None:
        raise last_missing
    raise FileNotFoundError("No champion bundle directory is available.")


def _payload_to_frame(args: dict[str, Any]) -> pd.DataFrame:
    if "data" in args and isinstance(args["data"], dict):
        payload = args["data"]
        colnames = payload.get("colnames", [])
        rows = payload.get("rows", [])
        return pd.DataFrame(rows, columns=colnames)

    rows = args.get("rows", [])
    if rows and isinstance(rows[0], dict):
        return pd.DataFrame(rows)

    if rows and isinstance(rows[0], list):
        return pd.DataFrame(rows)

    if "records" in args and isinstance(args["records"], list) and args["records"]:
        records = args["records"]
        if isinstance(records[0], dict):
            return pd.DataFrame(records)

    # Allow direct single-row payloads from CAI model test UIs where the body is
    # the feature object itself rather than {"rows": [...]}.
    reserved_keys = {"data", "rows", "records"}
    direct_payload = {key: value for key, value in args.items() if key not in reserved_keys}
    if direct_payload:
        return pd.DataFrame([direct_payload])

    raise ValueError(
        "Unsupported payload format. Use one of: "
        "{'rows': [{...}]}, "
        "{'records': [{...}]}, "
        "{'data': {'colnames': [...], 'rows': [[...]]}}, "
        "or a direct single-record JSON object."
    )


@_model_decorator()
def predict(args: dict[str, Any]) -> dict[str, Any]:
    try:
        pipeline, metadata = _load_bundle()
        raw_frame = _payload_to_frame(args)
        feature_frame = prepare_inference_features(raw_frame, metadata)
        probabilities = pipeline.predict_proba(feature_frame)[:, 1]
        labels = (probabilities >= 0.5).astype(int)

        rows = []
        for probability, label in zip(probabilities, labels):
            rows.append(
                {
                    "fraud_probability": round(float(probability), 6),
                    "predicted_label": int(label),
                    "model_name": metadata.get("model_name", "unknown"),
                }
            )

        return {
            "predictions": rows
        }
    except Exception as exc:  # pragma: no cover - debug-friendly CAI response path
        return {
            "error": {
                "type": exc.__class__.__name__,
                "message": str(exc),
                "traceback": traceback.format_exc(limit=5),
            }
        }
