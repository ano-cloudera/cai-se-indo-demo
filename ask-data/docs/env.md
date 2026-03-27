# Ask Data Environment Reference

This document lists the main runtime environment variables expected by the project.

Important:

- Cloudera AI runtime environment variables are the primary source of configuration.
- `.env.example` and `.env.local.example` files are documentation only and optional local fallback.

## Backend environment variables

### App

- `APP_ENV`
- `APP_HOST`
- `APP_PORT`
- `APP_DEBUG`

### Impala / database

- `IMPALA_HOST`
- `IMPALA_PORT`
- `IMPALA_HTTP_PATH`
- `CDP_USER`
- `CDP_PASS`
- `DB_NAME`

### Azure OpenAI

- `AZURE_OPENAI_ENDPOINT`
- `AZURE_OPENAI_API_KEY`
- `AZURE_OPENAI_API_VERSION`
- `AZURE_OPENAI_DEPLOYMENT`
- `AZURE_OPENAI_MODEL`

### Session and memory

- `SESSION_BACKEND`
- `SESSION_TTL_MINUTES`
- `MEMORY_MAX_HISTORY`

### SQL safety and execution

- `SQL_DEFAULT_LIMIT`
- `SQL_MAX_PREVIEW_ROWS`
- `SQL_ALLOWED_TABLES`

### CAI backend runtime

- `PORT`
- `CDSW_APP_PORT`

## Frontend environment variables

- `NEXT_PUBLIC_API_BASE_URL`
- `PORT`
- `CDSW_APP_PORT`

## Notes

- The frontend must point to the backend URL using `NEXT_PUBLIC_API_BASE_URL`.
- For CAI Application hosting, `CDSW_APP_PORT` should be preferred when present.
- Recommended `SQL_ALLOWED_TABLES` value is `customers,deposits,credits,fraud_transactions`.
- No secrets should be hardcoded into source files.
