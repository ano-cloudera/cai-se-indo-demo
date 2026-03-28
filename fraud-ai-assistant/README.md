# Fraud AI Assistant

`fraud-ai-assistant` is the primary project in this workspace.

It is built for a CAI demo where a user can investigate suspicious transactions, ask fraud-focused business questions, and train a traditional baseline fraud model using the same shared Impala data foundation.

## Current Role In This Workspace

- primary demo track for fraud analytics and investigation
- fraud-specific assistant with stronger domain framing than `ask-data`
- home of the traditional fraud ML workflow in `ml-templates`
- aligned to current CAI deployment and shared Impala configuration

## Current Shared Data Configuration

The project is aligned to the current CAI demo configuration:

- Impala database: `cai_sdx_se_indonesia`
- shared data root: `s3a://go01-demo/user/cai-demo-se-indonesia/data/`
- expected tables:
  - `customers`
  - `deposits`
  - `credits`
  - `fraud_transactions`

The main fraud label is:

- `fraud_flag`

The explainability-only field is:

- `fraud_reason`

## What The Project Includes

### Fraud assistant application

- FastAPI backend
- Next.js frontend
- fraud-aware text-to-SQL prompting
- read-only Impala execution
- natural-language investigation responses
- in-memory session and conversation support

### Traditional ML workflow

The `ml-templates` folder provides:

- bootstrap workflow
- baseline training workflow
- MLflow experiment logging
- champion packaging
- serving preparation assets

The current training workflow now supports:

- Impala as the default CAI data source
- local CSV as a fallback for local-only runs

## Folder Structure

```text
fraud-ai-assistant/
├── backend/
├── docs/
├── frontend/
├── ml-templates/
└── README.md
```

## CAI Deployment Model

The assistant portion is designed to run in CAI as separate backend and frontend Applications:

- backend application via `fraud-ai-assistant/backend/backend_entry.py`
- frontend application via `fraud-ai-assistant/frontend/frontend_entry.py`

The ML workflow is designed for CAI sessions or Jobs, using shared Impala access and environment variables for runtime configuration.

## Typical Questions It Should Support

- fraud rate by channel, type, city, branch, or segment
- suspicious transaction review
- new-device and foreign-IP patterns
- velocity and burst-transfer anomalies
- fraud distribution by time, geography, or beneficiary behavior

## Key Documentation

- backend guide: [`backend/README.md`](/Users/triano/Documents/Cloudera/cai-se-indo-demo/fraud-ai-assistant/backend/README.md)
- frontend guide: [`frontend/README.md`](/Users/triano/Documents/Cloudera/cai-se-indo-demo/fraud-ai-assistant/frontend/README.md)
- ML template guide: [`ml-templates/README.md`](/Users/triano/Documents/Cloudera/cai-se-indo-demo/fraud-ai-assistant/ml-templates/README.md)
- project status and handoff: [`docs/project-state.md`](/Users/triano/Documents/Cloudera/cai-se-indo-demo/fraud-ai-assistant/docs/project-state.md)
- environment variables: [`docs/env.md`](/Users/triano/Documents/Cloudera/cai-se-indo-demo/fraud-ai-assistant/docs/env.md)
