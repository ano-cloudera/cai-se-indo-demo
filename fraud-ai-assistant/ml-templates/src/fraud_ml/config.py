from __future__ import annotations

import os
from dataclasses import asdict, dataclass
from pathlib import Path


TARGET_COLUMN = "fraud_flag"
EXCLUDED_COLUMNS = {
    "fraud_reason",
    "transaction_id",
    "customer_id",
    "account_id",
    "device_id",
    "ip_address",
    "merchant_name",
}
RAW_TIME_COLUMNS = ("transaction_timestamp", "transaction_date")
DERIVED_TIME_COLUMNS = ("transaction_hour", "transaction_dayofweek", "transaction_month")
DEFAULT_EXPERIMENT_NAME = "fraud_detection_baseline"
PRIMARY_METRIC = "roc_auc"
SECONDARY_METRIC = "f1"
MODEL_CANDIDATES = ("logistic_regression", "random_forest")


@dataclass(frozen=True)
class TemplatePaths:
    project_root: Path
    data_path: Path
    artifact_root: Path

    @classmethod
    def from_args(cls, project_root: Path, data_path: str, artifact_root: str) -> "TemplatePaths":
        return cls(
            project_root=project_root.resolve(),
            data_path=(project_root / data_path).resolve(),
            artifact_root=(project_root / artifact_root).resolve(),
        )


@dataclass(frozen=True)
class ImpalaConfig:
    host: str
    port: int
    http_path: str
    database: str
    user: str
    password: str
    source_table: str = "fraud_transactions"

    @property
    def is_configured(self) -> bool:
        required_values = (
            self.host,
            self.http_path,
            self.database,
            self.user,
            self.password,
            self.source_table,
        )
        return all(bool(value) for value in required_values)


@dataclass(frozen=True)
class TrainingConfig:
    data_path: Path
    artifact_root: Path
    experiment_name: str
    random_seed: int
    data_source: str = "impala"
    impala: ImpalaConfig | None = None
    train_fraction: float = 0.70
    validation_fraction: float = 0.15
    test_fraction: float = 0.15
    target_column: str = TARGET_COLUMN
    primary_metric: str = PRIMARY_METRIC
    secondary_metric: str = SECONDARY_METRIC

    def as_dict(self) -> dict[str, object]:
        payload = asdict(self)
        payload["data_path"] = str(self.data_path)
        payload["artifact_root"] = str(self.artifact_root)
        return payload


def build_impala_config_from_env() -> ImpalaConfig:
    return ImpalaConfig(
        host=os.getenv("IMPALA_HOST", ""),
        port=int(os.getenv("IMPALA_PORT", "443")),
        http_path=os.getenv("IMPALA_HTTP_PATH", ""),
        database=os.getenv("DB_NAME") or os.getenv("IMPALA_DB") or "cai_sdx_se_indonesia",
        user=os.getenv("CDP_USER") or os.getenv("IMPALA_USER") or "",
        password=os.getenv("CDP_PASS") or os.getenv("IMPALA_PASSWORD") or "",
        source_table=os.getenv("FRAUD_SOURCE_TABLE", "fraud_transactions"),
    )


def build_training_config(
    data_path: Path,
    artifact_root: Path,
    experiment_name: str = DEFAULT_EXPERIMENT_NAME,
    random_seed: int = 42,
    data_source: str = "impala",
    impala: ImpalaConfig | None = None,
) -> TrainingConfig:
    return TrainingConfig(
        data_path=data_path.resolve(),
        artifact_root=artifact_root.resolve(),
        experiment_name=experiment_name,
        random_seed=random_seed,
        data_source=data_source,
        impala=impala,
    )
