# BNI Demo Project State

## Overview

`bni-demo` is a demo-ready banking analytics assistant designed for:

- local vibe coding and file generation
- runtime validation later inside Cloudera AI VS Code
- final hosting through Cloudera AI Applications

The project uses:

- FastAPI backend
- Impala / Cloudera Data Warehouse connectivity
- Azure OpenAI for SQL generation
- Azure OpenAI for natural-language answer synthesis
- in-memory session and memory support
- safe SQL validation and execution
- Next.js + Tailwind frontend

## Original implementation plan

The project has been built incrementally in these phases:

1. Backend foundation
2. Azure OpenAI tooling
3. Session and memory layer
4. Safe SQL execution layer
5. LLM domain understanding layer
6. Frontend Next.js + Tailwind
7. Natural-language answer layer
8. Documentation sync
9. Deployment and runtime validation in Cloudera AI

## Plan status

### Completed phases

1. Backend foundation
2. Azure OpenAI tooling
3. Session and memory layer
4. Safe SQL execution layer
5. LLM domain understanding layer
6. Frontend Next.js + Tailwind
7. Natural-language answer layer
8. Documentation sync

### In-progress phase

9. Deployment and runtime validation in Cloudera AI

Already completed inside phase 9:

- backend CAI Application launcher via `backend_entry.py`
- backend CAI session launcher via `backend_session.py`
- frontend CAI Application launcher via `frontend_entry.sh`
- frontend CAI Application Python launcher via `frontend_entry.py`
- backend permissive CORS for separate frontend Application calls
- setup and environment documentation refresh for CAI usage

Remaining scope inside phase 9:

- validate backend startup inside Cloudera AI VS Code
- validate frontend startup inside Cloudera AI VS Code
- confirm backend env vars are injected correctly in CAI runtime
- confirm frontend env vars are injected correctly in CAI runtime
- connect frontend to deployed backend using the correct CAI URL
- validate `/health`, `/health/db`, `/sql/generate`, `/sql/execute`, and `/chat/query`
- test the frontend as a long-running Cloudera AI Application
- confirm `CDSW_APP_PORT` hosting behavior works as expected
- finalize deployment notes for CAI session usage and Application hosting

## Project folder structure

Current project structure:

```text
bni-demo/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── schemas/
│   │   └── services/
│   ├── tests/
│   ├── .env.example
│   ├── backend_entry.py
│   ├── backend_session.py
│   ├── README.md
│   └── requirements.txt
├── docs/
│   ├── api-contract.md
│   ├── env.md
│   ├── project-state.md
│   └── setup.md
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── .env.local.example
│   ├── README.md
│   ├── frontend_entry.sh
│   ├── next.config.ts
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.ts
│   └── tsconfig.json
├── .gitignore
└── README.md
```

## What has been completed

### 1. Backend foundation

Completed:

- FastAPI app scaffolded under `backend/app`
- environment-based configuration via `pydantic-settings`
- reusable Impala connection layer
- base endpoints:
  - `GET /`
  - `GET /health`
  - `GET /health/db`
  - `GET /tables`

Status:
- complete

### 2. Azure OpenAI tooling

Completed:

- Azure OpenAI config support in backend settings
- reusable Azure OpenAI client wrapper
- text-to-SQL prompt builder
- SQL generation service

Status:
- complete

### 3. Session and memory layer

Completed:

- in-memory session store with TTL
- in-memory conversation memory
- session continuity via `session_id`
- storage for:
  - recent user and assistant exchanges
  - last generated SQL
  - last result preview
  - last intent
  - last answer

Status:
- complete for demo scope

### 4. Safe SQL execution layer

Completed:

- SQL normalization and validation
- read-only enforcement
- single-statement enforcement
- allowed-table restriction to:
  - `customers`
  - `deposits`
  - `credits`
- optional default `LIMIT`
- safe SQL executor returning preview-friendly JSON
- endpoints:
  - `POST /sql/generate`
  - `POST /sql/execute`
  - `POST /chat/query`
  - `POST /chat/answer`

Status:
- complete for current demo scope

### 5. LLM domain understanding layer

Completed:

- stronger text-to-SQL system prompt
- banking business context
- trusted schema context
- relationship and join guidance
- prompt composition that combines:
  - system prompt
  - business context
  - schema context
  - safety rules
  - optional memory

Status:
- complete

### 6. Frontend Next.js + Tailwind

Completed:

- Next.js App Router setup
- TypeScript and Tailwind scaffold
- CAI-friendly frontend scripts using:
  - `CDSW_APP_PORT`
  - `PORT`
- shared backend API client using:
  - `NEXT_PUBLIC_API_BASE_URL`
- frontend features:
  - backend health check
  - session display
  - natural language input
  - generate SQL only flow
  - generate and run flow
  - generated SQL preview
  - executed SQL preview
  - result table preview

Status:
- complete

### 7. Natural-language answer layer

Completed:

- answer synthesis prompt and system prompt
- reusable answer generator service
- `/chat/query` updated to return:
  - `answer`
  - `generated_sql`
  - `executed_sql`
  - `columns`
  - `rows`
  - `row_count`
  - `truncated`
  - `limit_applied`
- `/chat/answer` added for demo-friendly answer-only payload
- answer stored into session memory when `session_id` is present
- frontend updated to display the answer prominently

Status:
- complete

### 8. Documentation sync

Completed:

- root `README.md` updated
- `backend/README.md` updated
- `frontend/README.md` updated
- `docs/api-contract.md` created and filled

Status:
- complete

### 9. Deployment hardening and conversational polish

Completed:

- backend CAI Application launcher via `backend_entry.py`
- backend CAI session launcher via `backend_session.py`
- frontend CAI Application launcher via `frontend_entry.sh`
- permissive CORS enabled for demo use
- `docs/setup.md` and `docs/env.md` filled and aligned to actual runtime flow
- assistant persona introduced as `BNI Data Analyst Assistant`
- greeting and smalltalk handling added before SQL flow
- non-data conversation now routed to Azure OpenAI for more natural replies
- hardcoded social responses kept only as safe fallback when LLM is unavailable
- frontend starter prompts added
- frontend answer rendering updated to preserve line breaks cleanly
- frontend sidebar simplified to focus on chat usage instead of technical panels
- frontend bottom-left static workspace/settings card added for layout balance
- frontend visual depth separation improved between background, sidebar, and main workspace
- frontend hero and greeting wording aligned to use `Data Analyst Assistant` in user-facing self-introduction
- assistant chat bubble label simplified to `Analyst Response`, with the extra side caption removed
- assistant chat bubble width reduced slightly for better balance against the user bubble
- user chat bubble width and padding tightened for a more balanced conversation layout
- chat composer now supports `Enter` to send and `Shift+Enter` for a new line
- frontend CAI Python launcher now resolves `npm` and `node` more defensively for NVM-based runtimes
- frontend CAI Python launcher now prefers the Next.js standalone server after build
- backend `main.py` currently has CORS middleware commented out pending final CAI access-mode decision
- latest CAI browser testing shows request failures are currently influenced by CAI login redirect / app access behavior, not only by FastAPI CORS settings

Status:
- partially complete
- runtime validation in actual CAI sessions and Applications still pending

## Current backend state

### Main backend capabilities

- Impala connectivity through configured runtime environment variables
- Azure OpenAI text-to-SQL generation
- safe SQL validation and execution
- in-memory session continuity
- natural-language answer synthesis grounded in result preview
- greeting, acknowledgement, farewell, and non-data chat routing for demo-friendly conversation
- conversational non-data replies generated through Azure OpenAI with persona guidance
- persona-driven assistant responses via `BNI Data Analyst Assistant`
- user-facing introduction wording aligned to `Data Analyst Assistant` for a cleaner greeting
- CORS enabled for separate frontend Application access
- current CAI deployment testing indicates cross-application browser access may still be gated by CAI login redirect behavior

### Main backend endpoints

- `GET /`
- `GET /health`
- `GET /health/db`
- `GET /tables`
- `POST /sql/generate`
- `POST /sql/execute`
- `POST /chat/query`
- `POST /chat/answer`

### Main `/chat/query` flow

1. receive business question
2. if the input is greeting, acknowledgement, farewell, or non-data chat, route it to the conversational Azure OpenAI flow
3. otherwise generate SQL
4. validate SQL through guardrails
5. execute SQL against Impala
6. synthesize natural-language answer from preview rows only
7. return answer plus SQL/result transparency fields

### Main `/chat/answer` flow

1. reuse the same chat flow as `/chat/query`
2. return only:
   - `session_id`
   - `original_question`
   - `answer`
3. for user-facing safety, return a natural fallback answer instead of raw technical errors when processing fails

## Current frontend state

### Main frontend capabilities

- CAI-ready Next.js frontend
- client-side `session_id` persistence
- `/chat/answer` integration as the primary user-facing chat flow
- answer-only friendly rendering for conversational responses
- answer-first chat workspace UI
- starter prompts for first interaction
- line-break-preserving rendering for multi-line answers and greetings
- BNI-branded sidebar and hero layout
- simplified sidebar without technical session/API/debug cards
- static bottom-left workspace/settings card for visual balance
- stronger visual depth separation for sidebar and main panel
- top-left brand block simplified without the extra small caption line
- assistant response card simplified with a shorter label and tighter visual proportions
- user and assistant chat bubbles rebalanced to feel more symmetrical in the thread
- chat input now supports keyboard-first sending behavior
- Python-based CAI launcher available when `.sh` file selection is not supported by the CAI Application picker

### Frontend response rendering

For the main frontend chat flow, the UI now shows:

1. human-readable answer
2. user and assistant conversation thread
3. starter prompts for quick interaction

For greeting-style responses, the UI now shows:

1. a natural assistant greeting
2. starter suggestions in the answer and input area
3. no forced SQL execution

## Current trusted demo schema

### `customers`

- `customer_id`
- `full_name`
- `birth_date`
- `city`
- `segment`
- `join_date`

### `deposits`

- `account_id`
- `customer_id`
- `product_type`
- `balance`
- `maturity_date`
- `branch_code`
- `status`

### `credits`

- `credit_id`
- `customer_id`
- `credit_type`
- `principal_amount`
- `outstanding_balance`
- `interest_rate`
- `disbursement_date`
- `maturity_date`
- `collectibility`
- `branch_code`
- `status`

### Relationship

- `customers.customer_id = deposits.customer_id`
- `customers.customer_id = credits.customer_id`
- one customer can have multiple deposit accounts
- one customer can have multiple credit accounts

## Main runtime environment expectations

### Backend

- `IMPALA_HOST`
- `IMPALA_PORT`
- `IMPALA_HTTP_PATH`
- `CDP_USER`
- `CDP_PASS`
- `DB_NAME`
- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_MODEL`
- `SESSION_BACKEND`
- `SESSION_TTL_MINUTES`
- `MEMORY_MAX_HISTORY`
- `SQL_DEFAULT_LIMIT`
- `SQL_MAX_PREVIEW_ROWS`
- `SQL_ALLOWED_TABLES`

### Frontend

- `NEXT_PUBLIC_API_BASE_URL`
- `PORT`
- `CDSW_APP_PORT`

## What is ready now

Ready now:

- backend code structure
- frontend code structure
- backend and frontend contract for `answer`
- demo-ready banking text-to-SQL flow
- demo-friendly answer-only endpoint via `/chat/answer`
- demo-friendly conversational behavior for greetings, thanks, farewells, and other non-data chat
- non-data chat responses generated through Azure OpenAI with fallback protection
- refined BNI-branded answer-first frontend layout
- aligned user-facing greeting copy between backend and frontend
- CAI-friendly frontend hosting configuration
- CAI-friendly Python launcher for frontend startup
- CAI backend/frontend launcher files
- documentation for main flow and API contract

## What is not yet runtime-validated here

Not yet runtime-validated in this local environment:

- live backend startup with actual installed dependencies
- live frontend startup with actual installed dependencies
- real Impala connectivity
- real Azure OpenAI connectivity
- full end-to-end interaction from browser to backend in Cloudera AI

This is expected, because runtime validation is planned for Cloudera AI.

## Recommended next steps

Suggested next steps:

1. Validate backend startup inside Cloudera AI VS Code.
2. Validate frontend startup inside Cloudera AI session.
3. Test both `/chat/query` and `/chat/answer` with real runtime env vars.
4. Validate greeting and Bahasa Indonesia behavior in CAI.
5. Confirm the frontend points to the deployed backend URL.
6. Run the frontend as a Cloudera AI Application.
7. Resolve CAI cross-application access mode so browser requests to backend do not redirect to CAI login.
8. Validate non-data conversation quality in CAI for greetings, gratitude, farewell, and out-of-domain prompts.
9. If needed, refine answer style and prompt quality based on demo feedback.
10. Add stronger docs for deployment, environment setup, and test scenarios.

## Handoff notes

Important current handoff points for the next engineer or model:

- Use `backend_session.py` for CAI session backend startup instead of `uvicorn --reload`.
- Use `backend_entry.py` for backend CAI Application startup.
- Use `frontend_entry.py` as the preferred frontend CAI Application startup file when the CAI picker does not expose `.sh` files.
- `frontend_entry.sh` still exists as an alternative launcher.
- Frontend must be configured with `NEXT_PUBLIC_API_BASE_URL`.
- `/chat/query` is the full debug endpoint.
- `/chat/answer` is the demo-friendly minimal answer endpoint.
- Greeting, gratitude, farewell, and non-data chat are handled before SQL generation.
- Non-data conversation now uses Azure OpenAI as the primary response path.
- The assistant persona remains `BNI Data Analyst Assistant`, but the user-facing intro copy now says `Data Analyst Assistant`.
- Current CAI browser issue is likely tied to login redirect / application access policy rather than simple frontend fetch wiring.
- Remaining work is mostly runtime validation and deployment verification inside CAI.
