from __future__ import annotations

from typing import Any

import pandas as pd

from fraud_ml.config import DERIVED_TIME_COLUMNS, EXCLUDED_COLUMNS, RAW_TIME_COLUMNS, TARGET_COLUMN


def build_event_timestamp(frame: pd.DataFrame) -> pd.Series:
    timestamp_series = None

    if "transaction_timestamp" in frame.columns:
        timestamp_series = pd.to_datetime(frame["transaction_timestamp"], errors="coerce")

    if (timestamp_series is None or timestamp_series.isna().all()) and "transaction_date" in frame.columns:
        fallback = pd.to_datetime(frame["transaction_date"], errors="coerce")
        timestamp_series = fallback if timestamp_series is None else timestamp_series.fillna(fallback)

    if timestamp_series is None or timestamp_series.isna().all():
        raise ValueError("Could not derive a valid event timestamp from transaction_timestamp or transaction_date.")

    return timestamp_series


def engineer_features(frame: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    working = frame.copy()
    event_timestamp = build_event_timestamp(working)

    working["transaction_hour"] = event_timestamp.dt.hour.fillna(-1).astype(int)
    working["transaction_dayofweek"] = event_timestamp.dt.dayofweek.fillna(-1).astype(int)
    working["transaction_month"] = event_timestamp.dt.month.fillna(-1).astype(int)

    drop_columns = [column for column in RAW_TIME_COLUMNS if column in working.columns]
    working = working.drop(columns=drop_columns)

    return working, event_timestamp


def prepare_training_frame(frame: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series, dict[str, Any]]:
    working, event_timestamp = engineer_features(frame)
    excluded_columns = sorted(column for column in EXCLUDED_COLUMNS if column in working.columns)

    y = pd.Series(working[TARGET_COLUMN]).astype(int)
    X = working.drop(columns=[TARGET_COLUMN, *excluded_columns], errors="ignore")

    feature_metadata: dict[str, Any] = {
        "target_column": TARGET_COLUMN,
        "excluded_columns": excluded_columns,
        "derived_columns": list(DERIVED_TIME_COLUMNS),
        "feature_columns": list(X.columns),
        "event_timestamp_column": "transaction_timestamp",
    }
    return X, y, feature_metadata


def prepare_inference_features(frame: pd.DataFrame, feature_metadata: dict[str, Any]) -> pd.DataFrame:
    working, _ = engineer_features(frame)
    expected_columns = list(feature_metadata.get("feature_columns", []))

    if TARGET_COLUMN in working.columns:
        working = working.drop(columns=[TARGET_COLUMN], errors="ignore")

    excluded = feature_metadata.get("excluded_columns", [])
    if excluded:
        working = working.drop(columns=[column for column in excluded if column in working.columns], errors="ignore")

    for column in expected_columns:
        if column not in working.columns:
            working[column] = pd.NA

    if expected_columns:
        working = working[expected_columns]

    return working
