# Xray Assistant Backend

Backend service for chest X-ray upload, YOLO inference, annotated output generation, and Bedrock-based GenAI enrichment.

## Local Run

```bash
cd backend
python3.11 -m venv .venv311
source .venv311/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Model Artifact

The deploy-ready tracked model lives at:

```bash
backend/ml/models/chestxdet_subset_yolo11n_best.pt
```

Recommended env value:

```env
XRAY_MODEL_PATH=ml/models/chestxdet_subset_yolo11n_best.pt
```

## Cloudera AI Application

### Backend Application

- Working directory:
  `healthcare/Xray Assistant`
- Install command:
  `cd "healthcare/Xray Assistant/backend" && pip install --upgrade -r requirements.txt`
- Startup command:
  `python "healthcare/Xray Assistant/scripts/backend_entry.py"`

### Required Environment Variables

```env
XRAY_MODEL_PATH=ml/models/chestxdet_subset_yolo11n_best.pt
XRAY_CONFIDENCE_THRESHOLD=0.25
XRAY_RESPONSE_LANGUAGE=en
GENAI_PROVIDER=bedrock
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-5-20250929-v1:0
AWS_DEFAULT_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key_id
AWS_SECRET_ACCESS_KEY=your_secret_access_key
```
