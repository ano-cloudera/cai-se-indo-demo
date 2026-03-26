from __future__ import annotations

import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


def infer_feature_types(frame: pd.DataFrame) -> tuple[list[str], list[str]]:
    numeric_columns = list(frame.select_dtypes(include=["number", "bool"]).columns)
    categorical_columns = [column for column in frame.columns if column not in numeric_columns]
    return numeric_columns, categorical_columns


def build_preprocessor(frame: pd.DataFrame, with_scaling: bool) -> tuple[ColumnTransformer, dict[str, list[str]]]:
    numeric_columns, categorical_columns = infer_feature_types(frame)

    numeric_steps: list[tuple[str, object]] = [("imputer", SimpleImputer(strategy="median"))]
    if with_scaling:
        numeric_steps.append(("scaler", StandardScaler()))

    numeric_transformer = Pipeline(steps=numeric_steps)
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("numeric", numeric_transformer, numeric_columns),
            ("categorical", categorical_transformer, categorical_columns),
        ],
        remainder="drop",
    )

    metadata = {
        "numeric_columns": numeric_columns,
        "categorical_columns": categorical_columns,
    }
    return preprocessor, metadata
