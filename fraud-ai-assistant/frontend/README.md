# Fraud AI Assistant Frontend

This frontend is the web UI for the fraud-focused assistant in the CAI demo workspace.

It is designed for local development, CAI session validation, and CAI Application hosting.

## Frontend Responsibilities

- render the Stitch-aligned fraud console layout
- provide four main surfaces:
  - `Dashboard`
  - `AI Assistant`
  - `Investigations`
  - `Model Management`
- collect fraud investigation and fraud analytics questions
- keep lightweight client session continuity
- call the backend through `NEXT_PUBLIC_API_BASE_URL`
- display backend and database health state
- fall back to preview data when the backend is unavailable
- keep the dashboard usable even during frontend-only local work

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

If the backend is not running, the frontend should still render in preview mode using fallback dashboard, investigations, and assistant content.

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

## Current UI Expectations

### Dashboard

The dashboard should show:

- fraud overview KPI cards
- fraud signal velocity panel
- channel surface panel
- risk modalities panel
- regional risk panel
- critical intelligence log
- analyst workload summary

### AI Assistant

When a user submits a question through `/chat/query`, the UI should show:

- a concise fraud-oriented answer
- optional evidence or high-risk transaction table
- contextual right-rail metrics

### Investigations

The investigations surface should show:

- suspicious transaction queue
- selected case profile
- linked entity view
- transaction timeline
- analyst notes

### Model Management

The model management surface should stay lightweight and truthful:

- current active model
- deployment health
- deployment bundle visibility
- endpoint contract
- recent pipeline runs

The experience should feel more investigation-oriented than the generic `ask-data` app, even though both share the same core architecture.
