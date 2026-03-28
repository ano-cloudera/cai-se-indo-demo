# Fraud Detection Traditional ML Template

This folder adapts the legacy Cloudera AI ML template into a traditional fraud detection workflow for tabular transaction data.

It is intentionally limited to:

- bootstrap and environment setup
- model training
- experiment tracking with MLflow
- evaluation and artifact generation
- champion model packaging
- preparation for later Cloudera AI model serving

It does not include:

- FastAPI
- frontend code
- Kafka, NiFi, Iceberg, or Airflow integration
- real-time serving infrastructure

Current supported sources:

- Impala via Cloudera AI environment variables
- local CSV fallback for local development

## Current CAI Default

The current default CAI training source is:

- `cai_sdx_se_indonesia.fraud_transactions`

The training entrypoint now defaults to:

- `--data-source impala`

## Project Structure

```text
fraud-ai-assistant/ml-templates/
├── README.md
├── requirements.txt
├── cdsw-build.sh
├── lineage.yml
├── 0_bootstrap.py
├── 1_train_fraud_job.py
├── 2_package_model.py
├── model_serving.py
├── src/
│   └── fraud_ml/
│       ├── __init__.py
│       ├── config.py
│       ├── data.py
│       ├── features.py
│       ├── preprocessing.py
│       ├── train.py
│       ├── evaluate.py
│       ├── packaging.py
│       └── mlflow_utils.py
└── artifacts/
    ├── runs/
    └── champion/
```

## Dataset Assumptions

Default CAI input:

- Impala table `cai_sdx_se_indonesia.fraud_transactions`

Local fallback input:

```bash
../../sample/fraud_transactions.csv
```

Model target:

- `fraud_flag`

Columns excluded from model training:

- `fraud_reason`
- `transaction_id`
- `customer_id`
- `account_id`
- `device_id`
- `ip_address`
- `merchant_name`

Derived time features:

- `transaction_hour`
- `transaction_dayofweek`
- `transaction_month`

## Local Setup

```bash
cd fraud-ai-assistant/ml-templates
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 0_bootstrap.py --data-source csv --data ../../sample/fraud_transactions.csv
```

## Local Training

```bash
cd fraud-ai-assistant/ml-templates
source .venv/bin/activate
python3 1_train_fraud_job.py \
  --data-source csv \
  --data ../../sample/fraud_transactions.csv \
  --experiment-name fraud_detection_baseline \
  --artifact-root ./artifacts
```

What the training job does:

- loads and validates fraud training data from Impala or CSV
- derives time-based features
- preprocesses numeric and categorical columns
- trains two baseline models:
  - logistic regression
  - random forest
- evaluates on validation and test splits
- logs experiments to local MLflow storage
- writes local per-run artifacts under `artifacts/runs/`
- records the champion selection for packaging

## Local Packaging

Package the most recently selected champion:

```bash
cd fraud-ai-assistant/ml-templates
source .venv/bin/activate
python3 2_package_model.py --artifact-root ./artifacts
```

Package a specific MLflow run:

```bash
cd fraud-ai-assistant/ml-templates
source .venv/bin/activate
python3 2_package_model.py --artifact-root ./artifacts --run-id <mlflow_run_id>
```

Champion bundle output:

```text
artifacts/champion/
├── pipeline.joblib
├── model.joblib
├── preprocessor.joblib
├── feature_metadata.json
├── metrics.json
├── training_config.json
├── model_version.json
└── champion_run.json
```

## CAI Session Commands

Bootstrap:

```bash
cd fraud-ai-assistant/ml-templates
pip3 install -r requirements.txt
python3 0_bootstrap.py --data-source impala
```

Training job:

```bash
cd fraud-ai-assistant/ml-templates
python3 1_train_fraud_job.py \
  --data-source impala \
  --experiment-name fraud_detection_baseline \
  --artifact-root ./artifacts
```

Expected CAI environment variables:

- `IMPALA_HOST`
- `IMPALA_PORT`
- `IMPALA_HTTP_PATH`
- `CDP_USER`
- `CDP_PASS`
- `DB_NAME=cai_sdx_se_indonesia`
- optional `FRAUD_SOURCE_TABLE=fraud_transactions`

If Impala is not available, you can still run the local fallback path with:

```bash
python3 1_train_fraud_job.py \
  --data-source csv \
  --data ../../sample/fraud_transactions.csv \
  --experiment-name fraud_detection_baseline \
  --artifact-root ./artifacts
```

Packaging job:

```bash
cd fraud-ai-assistant/ml-templates
python3 2_package_model.py --artifact-root ./artifacts
```

## MLflow Tracking

If no tracking URI is provided, training uses a local file-based MLflow store under:

```text
artifacts/mlruns/
```

Model and evaluation artifacts are also written to local run folders under:

```text
artifacts/runs/
```

## Deployment Preparation

`model_serving.py` is the later serving entrypoint. It loads the packaged champion bundle and exposes:

- `predict(args)`

Expected output:

- fraud probability
- predicted label
- model version

This phase only prepares the scoring artifact and entrypoint. It does not create a service.
