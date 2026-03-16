# BNI Demo Backend

This backend is intended to be edited locally and validated at runtime inside Cloudera AI VS Code or a Cloudera AI application.

## Runtime model

- Runtime environment variables in Cloudera AI are the primary source of configuration.
- `.env.example` is documentation only and can be copied to `.env` for optional local fallback.
- Final runtime validation is expected to happen in Cloudera AI VS Code, not necessarily on the local machine.

## Backend scope in this phase

- FastAPI application bootstrap
- Environment-based configuration loading
- Reusable Impala connection layer
- Basic service and database health endpoints
- Azure OpenAI client wrapper for text-to-SQL generation
- Prompt builder and SQL generation service without execution
- In-memory session and conversation memory layer for future chat endpoints
- Safe SQL validation and execution layer with preview-oriented responses
- Domain-aware banking schema prompting for stronger text-to-SQL generation
- Natural-language answer synthesis grounded in query result previews

## Expected environment variables

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

## Install dependencies

```bash
pip install -r requirements.txt
```

## Run the backend

```bash
python backend_session.py
```

If Cloudera AI already injects the required environment variables, no local `.env` file is required.

## Run in a Cloudera AI session

```bash
pip install -r requirements.txt
python backend_session.py
```

This avoids `uvicorn --reload`, which can be unstable in some CAI session environments when the working directory changes.

## Run as a Cloudera AI Application

Use the launcher:

```bash
python backend_entry.py
```

The launcher reads `CDSW_APP_PORT` first, then `PORT`, then falls back to `8080`.

For demo deployment, the backend enables permissive CORS so a separate frontend Application can call it from the browser.

## LLM SQL generation

This phase adds a reusable Azure OpenAI client and a SQL generation service that converts a natural language question into read-only SQL for the configured database.

- SQL generation is separate from SQL execution.
- The prompt now includes business-aware schema context for a banking customer and deposit analytics demo.
- Current prompt constraints only allow the `customers` and `deposits` tables.
- Execution guardrails and stronger allowlisting can be tightened further in later phases.
- Runtime validation for this flow is expected to happen inside Cloudera AI VS Code.

## Natural-language answers

`POST /chat/query` now returns a human-readable answer in addition to SQL and tabular preview data.

- The answer is synthesized after SQL execution.
- The answer is grounded only in the preview rows returned by the executor.
- SQL generation, validation, and execution still remain available separately.
- The answer layer is intended to sound concise, business-friendly, and demo-ready.

## Session and memory

This phase adds an in-memory-only session layer intended for demo use and early development.

- Session continuity is keyed by `session_id`.
- Recent user and assistant exchanges are stored per session.
- The latest generated SQL, last result preview, and last intent can also be stored per session.
- TTL is controlled by `SESSION_TTL_MINUTES`.
- History trimming is controlled by `MEMORY_MAX_HISTORY`.
- There is no persistent storage yet; later phases can replace this layer with Redis or a database-backed store.

## Safe SQL execution

This phase adds validation and execution guardrails before SQL is sent to Impala.

- Only read-only `SELECT` and `WITH ... SELECT` queries are allowed.
- Allowed tables are limited to `customers` and `deposits`.
- Generated SQL is validated again before execution.
- Multi-statement SQL and dangerous keywords are blocked.
- Broad listing queries may receive an automatic `LIMIT`.
- Runtime validation should still happen later in Cloudera AI VS Code.

## API endpoints

- `GET /`
- `GET /health`
- `GET /health/db`
- `GET /tables`
- `POST /sql/generate`
- `POST /sql/execute`
- `POST /chat/query`

## Initial endpoints to validate in Cloudera AI

- `GET /`
- `GET /health`
- `GET /health/db`
- `GET /tables`
