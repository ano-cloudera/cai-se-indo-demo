# Ask Data

Ask Data is a Cloudera AI project for analytics text-to-SQL and answer generation.

The solution combines:

- **FastAPI backend**
- **Impala / Cloudera Data Warehouse connectivity**
- **Azure OpenAI for SQL generation**
- **Azure OpenAI answer synthesis**
- **Session and memory support**
- **Safe SQL validation and execution**
- **Next.js + Tailwind frontend**
- **Cloudera AI session testing and Application-ready hosting**

## Project Goal

The goal of this project is to provide a demo-ready analytics assistant that can:

- accept natural language questions
- generate safe read-only SQL
- validate and execute SQL against Impala
- return a natural human-readable business answer
- return structured results
- preserve session context across interactions
- provide a clean web frontend for demo users

## High-Level Architecture

### Backend
The backend is built with FastAPI and provides:

- health endpoints
- Impala connectivity
- Azure OpenAI SQL generation
- natural-language answer generation grounded in query previews
- SQL guardrails
- SQL execution
- in-memory session and memory handling

### Frontend
The frontend is built with Next.js and Tailwind CSS and provides:

- query input
- backend health visibility
- natural-language answer display
- generated SQL preview
- executed SQL preview
- result table rendering
- client-side session continuity

## Main Demo Flow

The primary demo flow is:

1. User submits a business question from the frontend.
2. Backend generates safe read-only SQL.
3. Backend validates and executes the SQL against Impala.
4. Backend synthesizes a concise human-readable answer from the preview result.
5. Frontend displays the answer first, followed by SQL and result details.

## Folder Structure

```text
ask-data/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   ├── core/
│   │   ├── db/
│   │   ├── schemas/
│   │   └── services/
│   ├── tests/
│   ├── .env.example
│   ├── README.md
│   └── requirements.txt
├── docs/
│   ├── api-contract.md
│   ├── env.md
│   └── setup.md
├── frontend/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── public/
│   ├── README.md
│   └── package.json
└── README.md
```

## Cloudera AI Application Readiness

This project is structured to run as two separate Cloudera AI Applications:

- backend application via `ask-data/backend/backend_entry.py`
- frontend application via `ask-data/frontend/frontend_entry.py`

Deployment assumptions:

- backend and frontend are deployed as separate Applications
- frontend points to the backend through `NEXT_PUBLIC_API_BASE_URL`
- Cloudera AI provides `CDSW_APP_PORT` at runtime
- backend secrets and connection settings are injected through Application environment variables
