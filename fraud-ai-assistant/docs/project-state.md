# Fraud AI Assistant Project State

## Current Direction

`fraud-ai-assistant` is now the primary focus of the workspace.

The goal is no longer a generic banking analytics assistant only. The active direction is a fraud analytics and investigation assistant that can:

- answer fraud-related questions in natural language
- generate safe read-only Impala SQL
- analyze suspicious transactions, fraud rate, risky channels, and customer/device anomalies
- use synthetic demo data that is explainable enough for demos and model experimentation

## Current Scope

The project currently includes:

- FastAPI backend
- Next.js frontend
- Azure OpenAI-based text-to-SQL flow
- natural-language answer generation
- Impala guardrails and allowlisted tables
- in-memory session and conversation memory
- domain-aware schema and business context for fraud analysis

## Dataset and Schema Status

The demo dataset now includes four core tables:

1. `customers`
2. `deposits`
3. `credits`
4. `fraud_transactions`

### `fraud_transactions`

Business purpose:
- transaction-level fraud monitoring, investigation, and demo modeling

Grain:
- one row per transaction

Key fields available:
- transaction identity: `transaction_id`, `customer_id`, `account_id`
- time and behavior: `transaction_timestamp`, `transaction_date`, `transaction_type`, `channel`, `amount`
- merchant and geography: `merchant_category`, `merchant_name`, `origin_city`, `destination_city`, `origin_branch_code`
- device and network: `device_id`, `device_os`, `ip_address`, `network_type`, `is_new_device`, `is_foreign_ip`
- customer profile features: `customer_segment`, `customer_age`, `account_tenure_days`
- velocity features: `days_since_last_txn`, `txn_count_1d`, `txn_count_7d`, `txn_amount_1d`, `txn_amount_7d`
- anomaly features: `avg_txn_amount_30d`, `amount_vs_avg_30d_ratio`, `is_round_amount`, `is_night_txn`, `is_weekend_txn`
- access and beneficiary features: `failed_login_count_24h`, `beneficiary_bank`, `beneficiary_account_age_days`, `is_new_beneficiary`
- explainability and scoring: `distance_from_home_km`, `velocity_risk_score`, `behavioral_risk_score`, `fraud_flag`, `fraud_reason`

Current generation target:
- synthetic but explainable
- balanced for demo use
- fraud label ratio around `40%`

## What Is Already Implemented

## Historical Plan and Implementation Log

### Plan history

Initial project direction:

- generic banking analytics assistant
- customer, deposit, and credit querying
- text-to-SQL and natural-language answers

Shift in direction:

- the workspace focus moved from generic banking analytics to fraud analytics
- the main assistant target became `fraud-ai-assistant`
- fraud transaction analysis and fraud ML preparation became the active delivery path

### Implementation log

Completed in order:

1. Fraud-oriented project state created for `fraud-ai-assistant`.
2. Synthetic fraud dataset design was defined with balanced `fraud_flag`.
3. `generate_demo_data.py` was extended to generate `sample/fraud_transactions.csv`.
4. `impala_demo_ddl.sql` was updated to add `fraud_transactions`.
5. Fraud-aware schema context, business context, and assistant prompts were updated.
6. `fraud-ai-assistant/ml-templates` was created as a traditional ML workflow adapted from the legacy root template.
7. Baseline fraud model training, MLflow logging, artifact packaging, and serving preparation were validated locally in the new ML folder.

Current latest milestone:

- traditional fraud ML template is now implemented and runnable inside `fraud-ai-assistant/ml-templates`

### Backend and SQL layer

Completed:

- read-only SQL generation and execution flow
- allowed-table config includes `fraud_transactions`
- schema context includes fraud table grain, columns, and join guidance
- business context includes fraud-focused question patterns
- chat fallbacks and conversation prompts now mention fraud analysis use cases

Status:
- complete for current local demo scope

### Impala schema

Completed:

- `impala_demo_ddl.sql` includes `CREATE EXTERNAL TABLE fraud_transactions`
- metadata invalidation includes `fraud_transactions`
- sanity-check queries added for:
  - total fraud transaction count
  - fraud vs non-fraud split
  - orphan `customer_id`
  - distribution by `channel` and `transaction_type`

Status:
- ready for Impala submission

### Synthetic data generation

Completed:

- `generate_demo_data.py` generates `sample/fraud_transactions.csv`
- customer join integrity validation for fraud data
- rule-based fraud pattern injection such as:
  - `new_device_high_amount`
  - `impossible_travel`
  - `burst_transfer`
  - `mule_pattern`
  - `account_takeover`

Current observed output:
- `24000` fraud transaction rows
- `9600` fraud rows
- fraud ratio `0.40`

Status:
- complete for v1 demo dataset

### Frontend and assistant experience

Completed:

- existing frontend and assistant stack remains usable
- prompt context now supports fraud-related SQL and conversational guidance

Status:
- functional, but still visually and experientially inherited from the earlier banking analytics setup

### Traditional ML template

Completed:

- new `fraud-ai-assistant/ml-templates` folder created from the legacy root template concept
- bootstrap entrypoint added for local and CAI-friendly setup
- modular fraud ML package added under `src/fraud_ml`
- baseline training compares logistic regression and random forest
- MLflow-compatible tracking added with local file-based tracking as default
- champion packaging flow added for later CML model serving
- `model_serving.py` added with a `predict(args)` entrypoint
- local end-to-end verification completed for:
  - bootstrap
  - training
  - champion packaging
  - serving smoke test

Current observed ML result:

- champion model: `random_forest`
- champion run id: `ed082ff0151d4c7c910a5b7c26c32d28`
- packaged champion metrics:
  - accuracy `0.9975`
  - precision `0.99722`
  - recall `0.996528`
  - f1 `0.996874`
  - roc_auc `0.99996`

Status:
- complete for v1 traditional fraud ML scope

## Current Constraints

- local backend unit tests could not be fully executed in the current environment because `pydantic_settings` is not installed locally
- runtime validation in actual Cloudera AI / Impala environment is still pending
- fraud dataset is intentionally synthetic and balanced for demo value, not for production realism
- the ML template uses `mlflow-skinny` instead of full `mlflow` in the current environment because full `mlflow` pulled `pyarrow` and required `cmake`, which was unnecessary for the CSV-first baseline flow

## Next Recommended Work

Priority order:

1. Validate the new Impala table end-to-end using the generated CSV and DDL.
2. Add sample CAI job definitions or runbook steps for the new ML template.
3. Add MLflow model signature and input example during model logging.
4. Add fraud-specific example prompts and starter questions in the frontend.
5. Tune answer phrasing so the assistant sounds explicitly like a fraud investigation assistant.
6. Add a few ready-to-demo SQL patterns:
   - fraud rate by channel
   - top suspicious transactions
   - repeated new-device fraud by customer
   - fraud amount by city
   - fraud trend by transaction date
7. Run backend tests again in an environment with required Python dependencies installed.

## Source of Truth Files

For the current fraud-focused direction, the main files are:

- `generate_demo_data.py`
- `sample/fraud_transactions.csv`
- `impala_demo_ddl.sql`
- `fraud-ai-assistant/backend/app/services/schema_context.py`
- `fraud-ai-assistant/backend/app/services/business_context.py`
- `fraud-ai-assistant/backend/app/core/config.py`
- `fraud-ai-assistant/ml-templates/1_train_fraud_job.py`
- `fraud-ai-assistant/ml-templates/2_package_model.py`
- `fraud-ai-assistant/ml-templates/model_serving.py`

## Status Summary

Current project status:

- fraud-focused direction: active
- fraud dataset and schema: implemented
- assistant schema context: updated
- Impala DDL: updated
- traditional fraud ML template: implemented
- local syntax verification: passed
- local ML dependency-complete verification: passed for the new ML template
- local backend dependency-complete test run: pending
- Cloudera AI runtime validation: pending
