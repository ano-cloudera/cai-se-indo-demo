from __future__ import annotations

from pathlib import Path

import pandas as pd

from fraud_ml.config import TARGET_COLUMN


def load_dataset(data_path: Path) -> pd.DataFrame:
    if not data_path.exists():
        raise FileNotFoundError(f"Fraud dataset not found: {data_path}")
    frame = pd.read_csv(data_path, low_memory=False)
    validate_dataset(frame, data_path)
    return frame


def validate_dataset(frame: pd.DataFrame, data_path: Path) -> None:
    if frame.empty:
        raise ValueError(f"Fraud dataset is empty: {data_path}")
    if TARGET_COLUMN not in frame.columns:
        raise ValueError(f"Required target column '{TARGET_COLUMN}' is missing from {data_path}")
    if frame[TARGET_COLUMN].isna().any():
        raise ValueError("Target column contains missing values.")
    if "transaction_id" in frame.columns and frame["transaction_id"].duplicated().any():
        raise ValueError("transaction_id contains duplicate values.")

    target_values = set(pd.Series(frame[TARGET_COLUMN]).dropna().astype(int).unique())
    if not target_values.issubset({0, 1}):
        raise ValueError(f"Unexpected fraud_flag values found: {sorted(target_values)}")
