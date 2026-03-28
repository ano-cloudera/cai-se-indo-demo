# Fraud AI Assistant Frontend

This frontend is the web UI for the fraud-focused assistant in the CAI demo workspace.

It is designed for local development, CAI session validation, and CAI Application hosting.

## Frontend Responsibilities

- collect fraud investigation and fraud analytics questions
- keep lightweight client session continuity
- call the backend through `NEXT_PUBLIC_API_BASE_URL`
- display backend and database health state
- present a concise answer first, with generated SQL and preview data visible for trust and debugging

## Required Environment Variables

- `NEXT_PUBLIC_API_BASE_URL`
- `PORT`
- `CDSW_APP_PORT`

`CDSW_APP_PORT` should be preferred in CAI Application hosting. The app falls back to `PORT`, then `3000`.

## Install And Run

```bash
npm install
npm run dev
```

## Run As A CAI Application

Preferred launcher:

```bash
python frontend_entry.py
```

Alternative launcher:

```bash
./frontend_entry.sh
```

Both launchers validate `NEXT_PUBLIC_API_BASE_URL`, use CAI port conventions, and start the app for Application hosting.

## UI Expectations

When a user submits a question through `/chat/query`, the UI should show:

- a concise fraud-oriented answer
- generated SQL
- executed SQL
- result preview rows

The experience should feel more investigation-oriented than the generic `ask-data` app, even though both share the same core architecture.
