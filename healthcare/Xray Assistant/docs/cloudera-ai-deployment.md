# Xray Assist — Cloudera AI Deployment

## Scope

This document captures the minimum deploy configuration for running Xray Assist as two Cloudera AI Applications:

- backend application
- frontend application

The repository is prepared so only the required application assets are pushed:

- backend and frontend source code
- docs and scripts
- tracked deploy model:
  `backend/ml/models/chestxdet_subset_yolo11n_best.pt`

Large local-only assets remain excluded from Git:

- ChestX-Det archives and extracted data
- local training runs
- temp outputs
- venvs
- local samples

## Backend Application

### Working directory

```bash
healthcare/Xray Assistant
```

### Install command

```bash
cd "healthcare/Xray Assistant/backend" && pip install --upgrade -r requirements.txt
```

### Startup command

```bash
python "healthcare/Xray Assistant/scripts/backend_entry.py"
```

### Required environment variables

```env
APP_NAME=Xray Assistant API
APP_VERSION=0.1.0
ENVIRONMENT=production
XRAY_MODEL_PATH=ml/models/chestxdet_subset_yolo11n_best.pt
XRAY_CONFIDENCE_THRESHOLD=0.25
XRAY_RESPONSE_LANGUAGE=en
GENAI_PROVIDER=bedrock
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-5-20250929-v1:0
BEDROCK_TIMEOUT_SECONDS=20
ENABLE_APP_CORS=false
CORS_ALLOW_ORIGINS=http://127.0.0.1:3000,http://localhost:3000,https://xray-frontend.ml-dbfc64d1-783.go01-dem.ylcu-atmi.cloudera.site
CORS_ALLOW_ORIGIN_REGEX=^https://.*\\.cloudera\\.site$
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```

## Frontend Application

### Working directory

```bash
healthcare/Xray Assistant
```

### Install command

```bash
cd "healthcare/Xray Assistant/frontend" && npm ci
```

### Startup command

```bash
python "healthcare/Xray Assistant/scripts/frontend_entry.py"
```

### Required environment variables

```env
BACKEND_API_BASE_URL=https://xray-backend.ml-dbfc64d1-783.go01-dem.ylcu-atmi.cloudera.site
NEXT_PUBLIC_API_BASE_URL=https://xray-backend.ml-dbfc64d1-783.go01-dem.ylcu-atmi.cloudera.site
NEXT_PUBLIC_XRAY_USE_MOCK=false
```

## Notes

- The backend can read both `healthcare/Xray Assistant/.env` and `healthcare/Xray Assistant/backend/.env` locally.
- In Cloudera AI, prefer setting application environment variables explicitly instead of relying on committed `.env` files.
- The frontend expects the backend response contract to include:
  `finding`, `confidence`, `severity`, `status`, `summary`, `explanation`, `action_items`, `annotated_image_path`, and `model_info`.
- Annotated images are served through backend static `/temp/...` URLs after inference.
- For two separate public Applications, the frontend must use the public backend URL, not `127.0.0.1`.
- In Cloudera AI, set `ENABLE_APP_CORS=false` so the application does not duplicate platform-managed CORS headers on POST responses.
