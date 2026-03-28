---
project: ask-data
document: project-state
version: 4
last_modified: 2026-03-29
workspace_root: /Users/trianonurhikmat/Documents/Works/cloudera/cai-demo
project_root: /Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/ask-data
repository_branch: main
latest_workspace_commits:
  - 5eaf14ea Restructure demo apps and clean repository layout
  - b598a5a8 Add fraud analytics data and traditional ML template
status: active
priority: secondary
current_focus: Maintain a reusable analytics assistant that can query banking and fraud demo data.
portable_reading: true
deployment_database: cai_sdx_se_indonesia
impala_external_data_location: s3a://go01-demo/user/cai-demo-se-indonesia/data/
---

# Ask Data Project State

## Resume Context

Use this document as the source of truth when reopening the project from another device, IDE, or AI coding tool.

Current interpretation:

- `ask-data` is the general analytics assistant in this workspace.
- It is no longer the primary innovation track.
- It remains important as the generic SQL and analytics interface that can query the shared demo data.
- It now understands `fraud_transactions` in addition to the original banking tables.
- the currently validated Impala database is `cai_sdx_se_indonesia`
- the currently validated external table location is `s3a://go01-demo/user/cai-demo-se-indonesia/data/`
- the current assistant behavior is aligned with the shared CAI demo schema used by `fraud-ai-assistant`

## Current Status

Project status summary:

- backend: implemented
- frontend: implemented
- text-to-SQL flow: implemented
- answer generation: implemented
- Impala guardrails: implemented
- fraud table awareness: implemented
- local repo structure cleanup: completed
- CAI Application deployment review: completed
- CAI launcher logic preservation: confirmed
- frontend production build verification: completed
- shared CAI database alignment with `fraud-ai-assistant`: completed
- full runtime validation in Cloudera AI: pending
- full backend test run in dependency-complete environment: pending

## Purpose

`ask-data` is a demo-ready analytics assistant designed to:

- translate natural language into safe read-only SQL
- run SQL against Impala or compatible warehouse targets
- summarize query results in natural language
- support generic banking analysis and lightweight fraud exploration

## Current Scope

The current app includes:

- FastAPI backend
- Next.js frontend
- Azure OpenAI-backed SQL generation and answer generation
- in-memory session and conversation support
- SQL validation and execution guardrails
- schema-aware and business-aware prompts

## Supported Data Model

The assistant now expects these core demo tables:

1. `customers`
2. `deposits`
3. `credits`
4. `fraud_transactions`

Important join assumptions:

- `deposits.customer_id = customers.customer_id`
- `credits.customer_id = customers.customer_id`
- `fraud_transactions.customer_id = customers.customer_id`

Important fraud-specific notes:

- grain of `fraud_transactions` is one row per transaction
- `fraud_flag` is the binary label
- `fraud_reason` is explainability metadata and should not be used as a model feature

## Architecture Snapshot

### Backend

- framework: FastAPI
- config style: environment-driven settings
- database target: Impala / Cloudera Data Warehouse
- LLM usage:
  - SQL generation
  - answer synthesis
- memory model:
  - in-memory session store
  - in-memory conversation memory

### Frontend

- framework: Next.js App Router
- styling: Tailwind CSS
- deployment expectation: compatible with Cloudera AI Application hosting

## Historical Plan and Delivery Log

### Original plan

The original project was built as a generic banking analytics assistant with:

- customer analytics
- deposit analytics
- credit analytics
- safe text-to-SQL
- natural-language answer synthesis

### Major implementation phases

1. Backend foundation
2. Azure OpenAI integration
3. Session and memory support
4. Safe SQL validation and execution
5. Schema and business context
6. Frontend implementation
7. Natural-language answer generation
8. Documentation sync
9. Cloudera AI runtime preparation

### Later workspace changes

After the fraud initiative became the main track:

- shared schema context was extended to include `fraud_transactions`
- allowlisted tables were expanded for fraud-aware SQL
- prompt context was updated so `ask-data` can answer fraud-adjacent questions
- repository structure was cleaned and `bni-demo` was migrated into `ask-data`
- deployment readiness for Cloudera AI Applications was reviewed without changing the existing launcher behavior

## What Is Implemented

### Backend and API

Implemented:

- health and database health endpoints
- SQL generation endpoint
- SQL execution endpoint
- combined chat query flow
- answer-only response flow
- session-aware response behavior

### Guardrails

Implemented:

- read-only SQL restriction
- single-statement enforcement
- allowlisted table access
- preview-friendly result formatting

Current allowlist direction:

- `customers`
- `deposits`
- `credits`
- `fraud_transactions`

### Prompt and Context Layer

Implemented:

- system prompt for SQL generation
- business context for banking and fraud analysis
- schema context with join guidance
- conversation prompt composition

### Frontend Experience

Implemented:

- natural-language input
- SQL preview
- execution preview
- answer card
- result table rendering
- backend health visibility

### Cloudera AI Application Readiness

Completed:

- deployment docs were aligned to the current `ask-data` folder structure
- backend and frontend environment references were refreshed
- frontend production build succeeded locally
- existing launcher logic in `backend_entry.py` and `frontend_entry.py` was intentionally preserved because it had already been working in prior CAI deployment flow

Current validation state:

- launcher logic preserved
- frontend build verified
- backend dependency-complete runtime verification still depends on installing Python requirements in the target environment

## Constraints

Current known constraints:

- runtime validation inside an actual Cloudera AI deployment is still pending
- local Python test execution depends on environment packages that may not be installed everywhere
- local backend import validation is currently blocked in bare environments that do not have `pydantic_settings` installed
- the app is still a demo architecture, not a production-hard multi-user platform
- fraud-focused UX copy in `ask-data` is intentionally lighter than in `fraud-ai-assistant`

## Recommended Next Actions

Priority order:

1. Validate the backend and frontend end-to-end inside Cloudera AI Applications.
2. Re-run backend tests in an environment with complete Python dependencies installed.
3. Confirm backend env injection and Impala connectivity in deployed mode.
4. Add a few explicit starter prompts for fraud-aware exploratory analysis.
5. Keep docs aligned with the current four-table shared demo schema.

## Key Files

Primary files to inspect first:

- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/ask-data/backend/app/core/config.py`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/ask-data/backend/app/services/schema_context.py`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/ask-data/backend/app/services/business_context.py`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/ask-data/backend/app/services/system_prompt.py`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/ask-data/backend/app/services/chat_router.py`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/ask-data/docs/setup.md`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/ask-data/docs/env.md`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/ask-data/frontend/app/page.tsx`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/sample/fraud_transactions.csv`
- `/Users/trianonurhikmat/Documents/Works/cloudera/cai-demo/impala_demo_ddl.sql`

## Handoff Notes

If another AI tool resumes from this file, the safe assumption is:

- the repo structure is already cleaned
- `ask-data` is stable and secondary in priority
- the existing CAI launcher files are intentionally preserved and should not be changed casually
- fraud-related innovation should usually happen in `fraud-ai-assistant` first
- changes to shared schema or demo data may still require corresponding updates in `ask-data`
