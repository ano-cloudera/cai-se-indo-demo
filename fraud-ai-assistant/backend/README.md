# Fraud AI Assistant Backend

This backend powers the fraud-focused assistant for the CAI demo workspace.

It is designed to run in Cloudera AI sessions and Applications, using Impala for read-only fraud analytics and Azure OpenAI for SQL generation and answer synthesis.

## Current Runtime Expectations

- Cloudera AI environment variables are the primary source of runtime configuration
- the current shared database is `cai_sdx_se_indonesia`
- the current allowlisted tables are `customers`, `deposits`, `credits`, and `fraud_transactions`
- final runtime validation should happen in CAI because network and auth are environment-specific

## Backend Responsibilities

- FastAPI application bootstrap
- environment-driven configuration loading
- Impala connection management
- service and database health endpoints
- Azure OpenAI-backed text-to-SQL generation
- SQL validation and execution guardrails
- fraud-aware schema and business prompting
- preview-based answer generation
- in-memory session and conversation support

## Expected Environment Variables

- `APP_ENV`
- `APP_HOST`
- `APP_PORT`
- `APP_DEBUG`
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

Recommended current CAI values:

- `DB_NAME=cai_sdx_se_indonesia`
- `SQL_ALLOWED_TABLES=customers,deposits,credits,fraud_transactions`

## Run Locally Or In CAI Session

```bash
pip install -r requirements.txt
python backend_session.py
```

If CAI already injects runtime variables, a local `.env` file is not required.

## Run As A CAI Application

```bash
python backend_entry.py
```

The launcher reads `CDSW_APP_PORT` first, then `PORT`, then falls back to `8080`.

## API Surface

- `GET /`
- `GET /health`
- `GET /health/db`
- `GET /tables`
- `POST /sql/generate`
- `POST /sql/execute`
- `POST /chat/query`

## Behavioral Notes

- only read-only `SELECT` and `WITH ... SELECT` statements are allowed
- generated SQL is validated before execution
- dangerous keywords and multi-statement SQL are blocked
- answer generation is grounded in result previews
- this app is intentionally more fraud-specific than `ask-data`, especially in prompting and investigation framing
