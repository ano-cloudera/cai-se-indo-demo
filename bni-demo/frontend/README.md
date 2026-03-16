# BNI Demo Frontend

This frontend is intended to be developed locally, tested in a Cloudera AI session, and then hosted as a long-running Cloudera AI Application.

## Runtime model

- Runtime validation is expected to happen later inside Cloudera AI VS Code or a Cloudera AI Application.
- Frontend runtime configuration should come from environment variables.
- `.env.local.example` is documentation only and can be copied for optional local fallback.
- Backend connectivity is explicit through `NEXT_PUBLIC_API_BASE_URL`.

## Required environment variables

- `NEXT_PUBLIC_API_BASE_URL`
- `PORT`
- `CDSW_APP_PORT`

`CDSW_APP_PORT` should be preferred when the frontend is hosted as a Cloudera AI Application. The npm scripts already fall back to `PORT` and then `3000`.

## Frontend capabilities in this phase

- Next.js App Router with TypeScript
- Tailwind CSS styling
- Shared API client for backend requests
- Backend health and database health checks
- Client-side `session_id` generation and persistence
- Natural language query flow via `/chat/query`
- Natural-language answer display from `/chat/query`
- SQL preview and result table rendering

## Pointing the frontend to the backend

Set:

```bash
NEXT_PUBLIC_API_BASE_URL=http://your-backend-host:8000
```

Do not hardcode localhost-only assumptions. The frontend expects the backend URL to come from the environment.

## Main demo response flow

When the user runs a question through `/chat/query`, the UI now shows:

- a human-readable business answer
- generated SQL
- executed SQL
- result preview table

The answer is intended to be the primary user-facing output, while SQL and result details remain visible for transparency.

## Install dependencies

```bash
npm install
```

## Run in a Cloudera AI session

```bash
npm run dev
```

This binds to `0.0.0.0` and uses `${CDSW_APP_PORT}` when present, otherwise `PORT`, then `3000`.

## Run as a Cloudera AI Application

Use the launcher:

```bash
./frontend_entry.sh
```

This validates `NEXT_PUBLIC_API_BASE_URL`, uses `${CDSW_APP_PORT}` when available, builds the app, and starts it for Application hosting.

The frontend must point to the backend Application URL through `NEXT_PUBLIC_API_BASE_URL`.
