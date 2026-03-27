---
project: fraud-ai-assistant
document: project-state
version: 3
last_modified: 2026-03-26
workspace_root: /Users/trianonurhikmat/Documents/Works/cloudera/cai-demo
project_root: /Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/fraud-ai-assistant
repository_branch: main
latest_workspace_commits:
  - 5eaf14ea Restructure demo apps and clean repository layout
  - b598a5a8 Add fraud analytics data and traditional ML template
status: active
priority: primary
current_focus: Fraud analytics assistant plus traditional fraud ML workflow for Cloudera AI.
portable_reading: true
---

# Fraud AI Assistant Project State

## Resume Context

Use this file as the primary handoff document for resuming the fraud work from another laptop, browser session, or AI coding tool.

Current interpretation:

- `fraud-ai-assistant` is the primary focus of the workspace
- the project now covers both assistant behavior and traditional fraud ML preparation
- the current implementation is demo-oriented, explainable, and aligned to later Cloudera AI workflows

## Current Status

Project status summary:

- fraud-focused assistant direction: active
- fraud dataset generation: implemented
- Impala DDL for fraud table: implemented
- backend schema and business context: implemented
- frontend inherited from previous analytics stack: usable
- traditional ML baseline workflow: implemented
- local ML workflow verification: completed
- shared ask-data deployment readiness review: completed
- runtime validation in real Cloudera AI / Impala: pending
- full backend test run in dependency-complete environment: pending

## Purpose

`fraud-ai-assistant` is intended to become a fraud investigation and fraud analytics assistant that can:

- answer fraud-related questions in natural language
- generate safe read-only SQL against fraud demo data
- help investigate suspicious transactions and behavioral anomalies
- provide a foundation for later Cloudera AI fraud scoring workflows

## Active Scope

The current scope includes:

- FastAPI backend
- Next.js frontend
- fraud-aware text-to-SQL prompting
- natural-language answer generation
- allowlisted Impala access
- in-memory session and conversation support
- traditional fraud ML workflow in `ml-templates`

Out of scope for the current phase:

- FastAPI scoring service for the ML model
- streaming or real-time fraud orchestration
- NiFi, Kafka, Iceberg, and Airflow integration
- production-hard online serving logic

## Shared Dataset and Schema State

The shared demo dataset currently includes:

1. `customers`
2. `deposits`
3. `credits`
4. `fraud_transactions`

### `fraud_transactions`

Business purpose:

- transaction-level fraud monitoring
- fraud investigation demos
- traditional ML experimentation

Grain:

- one row per transaction

Key column groups:

- identity: `transaction_id`, `customer_id`, `account_id`
- behavior: `transaction_timestamp`, `transaction_date`, `transaction_type`, `channel`, `amount`
- merchant and geography: `merchant_category`, `merchant_name`, `origin_city`, `destination_city`, `origin_branch_code`
- device and network: `device_id`, `device_os`, `ip_address`, `network_type`, `is_new_device`, `is_foreign_ip`
- profile and tenure: `customer_segment`, `customer_age`, `account_tenure_days`
- velocity: `days_since_last_txn`, `txn_count_1d`, `txn_count_7d`, `txn_amount_1d`, `txn_amount_7d`
- anomaly: `avg_txn_amount_30d`, `amount_vs_avg_30d_ratio`, `is_round_amount`, `is_night_txn`, `is_weekend_txn`
- access and beneficiary: `failed_login_count_24h`, `beneficiary_bank`, `beneficiary_account_age_days`, `is_new_beneficiary`
- explainability and scoring: `distance_from_home_km`, `velocity_risk_score`, `behavioral_risk_score`, `fraud_flag`, `fraud_reason`

Current generated output:

- file: `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/sample/fraud_transactions.csv`
- rows: `24000`
- fraud rows: `9600`
- fraud ratio: `0.40`

Important ML note:

- `fraud_flag` is the label
- `fraud_reason` is explainability metadata and should not be used as a training feature

## Historical Plan and Implementation Log

### Initial direction

The workspace originally started from a generic banking analytics assistant pattern.

### Direction shift

The active workspace direction later changed to:

- fraud analytics first
- explainable fraud dataset generation
- fraud-aware SQL assistance
- traditional ML baseline development for Cloudera AI

### Delivery log

Completed in order:

1. Fraud-oriented project-state and scope definition were created.
2. Fraud feature brainstorming was defined for synthetic transaction-level data.
3. `generate_demo_data.py` was extended to produce `sample/fraud_transactions.csv`.
4. `impala_demo_ddl.sql` was extended with the `fraud_transactions` table and validation queries.
5. Fraud-aware allowlists, schema context, business context, and prompts were added.
6. `fraud-ai-assistant/ml-templates` was built as a traditional fraud ML workflow adapted from the legacy template idea.
7. Local training, MLflow logging, packaging, and serving smoke checks were completed.
8. Repository structure was cleaned so the project is easier to reopen from different devices and tools.
9. `ask-data` deployment readiness was reviewed and documented while preserving the previously working launcher behavior.

## What Is Implemented

### Backend and SQL Layer

Implemented:

- read-only SQL generation and execution
- fraud-aware allowlisted table access
- fraud-focused schema context
- fraud-focused business context
- conversation and chat routing support for fraud use cases

Examples of supported analysis:

- fraud rate by channel
- suspicious transaction review
- repeated new-device fraud by customer
- fraud amount by city
- transaction trend analysis by date

### Impala Schema

Implemented:

- `impala_demo_ddl.sql` includes `CREATE EXTERNAL TABLE fraud_transactions`
- metadata invalidation includes the fraud table
- sanity checks cover:
  - total row count
  - fraud vs non-fraud split
  - orphan `customer_id`
  - distribution by `channel`
  - distribution by `transaction_type`

Helper script available:

- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/submit_impala_schema.py`

### Synthetic Data Generation

Implemented:

- fraud transaction generation under `sample/`
- controlled fraud-pattern injection
- customer join integrity validation
- explainability via `fraud_reason`

Current fraud-pattern examples:

- `new_device_high_amount`
- `impossible_travel`
- `burst_transfer`
- `mule_pattern`
- `account_takeover`

### Frontend and Assistant Layer

Implemented:

- frontend remains functional for demo exploration
- prompt context supports fraud-oriented question patterns
- fraud-specific backend behavior is already wired into the assistant stack

Current limitation:

- the overall visual and conversational experience still inherits part of the older banking analytics style

### Traditional ML Workflow

Implemented in `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/fraud-ai-assistant/ml-templates`:

- bootstrap entrypoint
- fraud training entrypoint
- champion packaging entrypoint
- model-serving preparation entrypoint
- modular fraud ML package under `src/fraud_ml`
- MLflow-compatible experiment logging
- artifact packaging for later CML serving

Baseline modeling choices:

- binary classification on `fraud_flag`
- leakage exclusion for `fraud_reason` and `transaction_id`
- categorical and numeric preprocessing
- probability output enabled
- baseline candidate models:
  - logistic regression
  - random forest

Current observed local result:

- champion model: `random_forest`
- champion run id: `ed082ff0151d4c7c910a5b7c26c32d28`
- metrics:
  - accuracy `0.9975`
  - precision `0.99722`
  - recall `0.996528`
  - f1 `0.996874`
  - roc_auc `0.99996`

## Constraints

Current known constraints:

- the dataset is synthetic and intentionally balanced for demo value
- production realism is not the target of the current data generator
- runtime validation against a live Cloudera AI and Impala environment is still pending
- cross-project deployment work should avoid changing `ask-data` launcher files unless there is a clear runtime failure to fix
- local backend tests could not be fully executed in environments missing required Python packages such as `pydantic_settings`
- the ML workflow currently uses `mlflow-skinny` rather than full `mlflow` because the baseline CSV-first workflow did not need the heavier dependency chain

## Recommended Next Actions

Priority order:

1. Validate the fraud table end-to-end in Impala using the generated CSV and DDL.
2. Add explicit CAI job or runbook examples for the traditional ML workflow.
3. Log MLflow model signature and input example during training.
4. Add fraud-first starter prompts and UX copy in the frontend.
5. Improve the assistant tone so it reads clearly as a fraud investigation assistant.
6. Re-run backend tests in a dependency-complete environment.

## Key Files

Primary files to inspect first:

- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/generate_demo_data.py`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/sample/fraud_transactions.csv`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/impala_demo_ddl.sql`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/submit_impala_schema.py`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/fraud-ai-assistant/backend/app/core/config.py`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/fraud-ai-assistant/backend/app/services/schema_context.py`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/fraud-ai-assistant/backend/app/services/business_context.py`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/fraud-ai-assistant/ml-templates/1_train_fraud_job.py`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/fraud-ai-assistant/ml-templates/2_package_model.py`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/fraud-ai-assistant/ml-templates/model_serving.py`

## Handoff Notes

If another AI tool resumes from this file, the safe assumption is:

- `fraud-ai-assistant` is the highest-priority project in the workspace
- shared schema and data generation are already fraud-aware
- traditional ML work should happen inside `fraud-ai-assistant/ml-templates`
- `ask-data` launcher behavior is intentionally preserved because it previously worked for CAI deployment
- any schema change in shared data likely needs updates in both `fraud-ai-assistant` and `ask-data`
