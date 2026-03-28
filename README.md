# CAI SE Indonesia Demo Workspace

This repository is the shared workspace for the CAI SE Indonesia demo environment on Cloudera AI.

It contains two application tracks that use the same demo data model in Impala:

- `ask-data` for a general analytics assistant
- `fraud-ai-assistant` for a fraud-focused assistant and a traditional ML workflow

## Current Shared Platform Configuration

These values are the current shared defaults for the CAI deployment:

- Impala database: `cai_sdx_se_indonesia`
- Shared data root: `s3a://go01-demo/user/cai-demo-se-indonesia/data/`
- Core tables:
  - `customers`
  - `deposits`
  - `credits`
  - `fraud_transactions`

Both applications are expected to use the same Impala connection pattern through environment variables such as:

- `IMPALA_HOST`
- `IMPALA_PORT`
- `IMPALA_HTTP_PATH`
- `CDP_USER`
- `CDP_PASS`
- `DB_NAME`

## Repository Layout

```text
cai-se-indo-demo/
├── ask-data/
├── fraud-ai-assistant/
├── sample/
├── scripts/
├── generate_demo_data.py
├── impala_demo_ddl.sql
├── submit_impala_schema.py
└── README.md
```

## Main Components

### `ask-data`

Generic analytics assistant for banking and fraud-adjacent questions.

- FastAPI backend
- Next.js frontend
- Azure OpenAI-based text-to-SQL and answer generation
- read-only Impala execution with guardrails
- suitable for general analytics demos on CAI

### `fraud-ai-assistant`

Fraud-specific demo track with both assistant behavior and traditional ML.

- FastAPI backend tuned for fraud analysis
- Next.js frontend for fraud investigation conversations
- fraud-aware schema and business context
- `ml-templates` for baseline fraud model training and packaging
- training workflow now supports Impala as the primary CAI data source

### Shared files

- `sample/` contains generated CSVs for local development and fallback testing
- `generate_demo_data.py` produces the synthetic demo datasets
- `impala_demo_ddl.sql` contains the shared Impala DDL
- `submit_impala_schema.py` applies the DDL to Impala from a configured Python session
- `scripts/` contains repository sync and helper scripts used during CAI operations

## Recommended Usage Model

### In Cloudera AI

- keep GitHub as the source of truth
- sync the CAI project from GitHub
- inject runtime configuration through CAI environment variables
- run backend and frontend as separate CAI Applications when needed
- use CAI Jobs for repeatable training, schema, or deployment tasks

### Locally

- use the repo for editing, review, and documentation
- use `sample/` CSV data for local fallback when Impala is not available
- validate final runtime behavior in CAI, especially for networking and authentication

## Where To Start

- root overview: [`README.md`](/Users/triano/Documents/Cloudera/cai-se-indo-demo/README.md)
- general analytics app: [`ask-data/README.md`](/Users/triano/Documents/Cloudera/cai-se-indo-demo/ask-data/README.md)
- fraud app: [`fraud-ai-assistant/README.md`](/Users/triano/Documents/Cloudera/cai-se-indo-demo/fraud-ai-assistant/README.md)
- fraud project handoff: [`fraud-ai-assistant/docs/project-state.md`](/Users/triano/Documents/Cloudera/cai-se-indo-demo/fraud-ai-assistant/docs/project-state.md)
- ask-data handoff: [`ask-data/docs/project-state.md`](/Users/triano/Documents/Cloudera/cai-se-indo-demo/ask-data/docs/project-state.md)
