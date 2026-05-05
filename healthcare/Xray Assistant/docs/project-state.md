# Xray Assist — Project State (Latest)

## Document Purpose

This document captures the current working state of the Xray Assist project.
It is intended as a handoff/reference so work can resume later without re-deriving repository context.

This version reflects the current local development baseline for:
- frontend demo flow
- backend inference API
- YOLO runtime wiring
- dataset preparation scaffolding
- Bedrock-based GenAI enrichment wiring

---

## 1. Executive Summary

**Use Case:** Chest X-ray review support demo

Xray Assist is a Cloudera-branded healthcare demo that supports:
- chest X-ray image upload
- object detection inference via YOLO runtime
- structured result presentation
- GenAI enrichment for summary, explanation, and suggested next actions

The current implementation is intended for:
- local development
- demo preparation
- future deployment/testing in Cloudera AI

It is **not** positioned as a diagnostic product.
All generated language should remain assistive and review-oriented.

**Deployment target:**
- Backend as a Cloudera AI Application
- Frontend as a Cloudera AI Application

---

## 2. Demo Flow

1. User opens the Xray Assist frontend.
2. User uploads a chest X-ray image.
3. Frontend previews the image immediately.
4. Frontend submits the image to `POST /api/v1/infer`.
5. Backend saves the upload to a local temp folder.
6. Backend runs YOLO inference through the current predictor layer.
7. Backend computes severity from confidence.
8. Backend optionally generates an annotated image.
9. Backend calls GenAI enrichment after detection.
10. Backend returns a merged response with:
    - finding
    - confidence
    - severity
    - detections
    - summary
    - explanation
    - action items
    - model metadata
11. Frontend renders scorecards, detection table, summary, explanation, actions, preview, and annotated output.

---

## 3. Architecture

| Layer | Technology |
|---|---|
| Detection runtime | Ultralytics YOLO11-compatible runtime |
| Dataset reference | ChestX-Det-Dataset |
| GenAI enrichment | AWS Bedrock |
| Backend | FastAPI + Uvicorn |
| Frontend | Next.js 15 + Tailwind CSS + TypeScript |
| Deployment target | Cloudera AI Applications |

### Current development note

The local repo is organized to keep upstream references isolated under:
- `healthcare/Xray Assistant/references`

No upstream code is modified in place.

---

## 4. Repository Layout

### Main project root

- `healthcare/Xray Assistant/`

### Important directories

- `backend/`
  FastAPI API, ML inference adapter, temp outputs, scripts, and dataset prep tooling
- `frontend/`
  Xray Assist demo UI adapted from `ask-data/frontend`
- `references/ultralytics`
  Local upstream YOLO reference repo
- `references/ChestX-Det-Dataset`
  Local upstream dataset annotation repo
- `docs/`
  Architecture, API, dataset prep, baseline repo notes, and this project-state document

---

## 5. Backend

**Stack:** FastAPI, Uvicorn, Pydantic, Ultralytics runtime adapter, OpenCV, boto3

### Entry point

- `backend/app/main.py`

### Current API endpoints

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Basic health check |
| `POST /api/v1/infer` | Main image inference endpoint |

### Current inference flow

The inference route currently:
- accepts multipart file upload
- stores the file under `backend/temp/uploads`
- calls `XrayPredictor`
- computes severity from returned confidence
- generates annotated image output when detections exist
- calls the GenAI service after detection
- returns `InferenceResponse`

### Current inference response shape

The backend is aligned to the frontend contract:
- `case_id`
- `status`
- `finding`
- `confidence`
- `severity`
- `detections`
- `summary`
- `explanation`
- `action_items`
- `annotated_image_path`
- `model_info`

### Predictor status

`ml/inference/predictor.py` is now wired to a real Ultralytics runtime.

Current behavior:
- loads model path from env
- fails cleanly if model path is missing or invalid
- supports fallback import from `references/ultralytics` if package import is unavailable
- returns normalized detection payload

Important note:
- The backend is now validated against a trained ChestX-Det-derived weight:
  `backend/ml/models/chestxdet_subset_yolo11n_best.pt`
- The original generic `yolo11n.pt` was only used earlier for runtime validation and is no longer the intended inference model

### Severity logic

Current confidence mapping:
- `>= 0.85` → `high`
- `>= 0.60` → `medium`
- otherwise → `low`

### Annotated output

`ml/inference/visualize.py` uses OpenCV to render simple bounding box overlays and save annotated files under:
- `backend/temp/annotated`

### Validation already performed

The backend has already been locally validated for:
- FastAPI startup
- `POST /api/v1/infer`
- file upload handling
- real YOLO runtime invocation
- annotated image generation

---

## 6. GenAI Enrichment

**Provider target:** AWS Bedrock

### Current status

Bedrock enrichment is now wired into the backend inference flow through:
- `app/services/genai_service.py`
- `app/services/bedrock_service.py`

### Current behavior

After detection completes:
1. backend builds a structured detection payload from:
   - `finding`
   - `confidence`
   - `severity`
   - `detections`
2. backend calls the GenAI service
3. GenAI returns:
   - `summary`
   - `explanation`
   - `action_items`
4. those fields are merged into the final API response

### Safety design

Prompting and fallback behavior are intentionally constrained:
- no definitive diagnosis wording
- wording stays assistive and review-oriented
- output should use language such as:
  - `suggests`
  - `may require review`
  - `should be correlated clinically`

### Fallback behavior

If Bedrock is:
- not configured
- unavailable
- misconfigured
- timed out
- returning unusable output

the API does **not** fail.
Instead, it returns fallback values for:
- `summary`
- `explanation`
- `action_items`

### Current Bedrock model target

The backend is currently configured to use Claude Sonnet 4.5 on Bedrock through:
- `BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-5-20250929-v1:0`

### Current limitation

Live Bedrock invocation has now been validated end-to-end locally with configured AWS credentials.
The remaining limitation is deployment validation inside Cloudera AI rather than local runtime wiring.

---

## 7. Frontend

**Stack:** Next.js 15, Tailwind CSS 3, TypeScript, Inter

### Current status

The frontend has been adapted from `ask-data/frontend` into a dedicated healthcare demo while preserving:
- the Cloudera logo
- the main shell
- the sidebar style
- the overall page structure

### Current UI behavior

The UI now supports:
- X-ray image upload
- image preview
- live scorecards
- findings overview table
- clinical summary
- clinical interpretation
- recommended actions
- analysis result image panel
- bilingual response selection for Bedrock enrichment

### Scorecards

Top scorecards are now bound to backend-compatible fields:
- `Finding` ← `finding`
- `Confidence` ← `confidence`
- `Severity` ← `severity`
- `Status` ← request lifecycle / backend status

### Frontend API mode

The frontend supports:
- backend mode as the main path
- mock mode as optional fallback

Env vars:
- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_XRAY_USE_MOCK`

### Layout status

Recent refinements already completed:
- sidebar simplified to one menu item: `Demo`
- header cleaned up
- scorecards made more compact
- scorecards forced into one row on desktop
- typography and spacing improved for executive readability

### Validation already performed

The frontend has already been validated with:
- `tsc --noEmit`
- `next build`

---

## 8. Dataset Preparation

### Reference dataset

- `references/ChestX-Det-Dataset`

### Current preparation tooling

Prepared dataset tooling exists under:
- `backend/ml/training/prepare_chestxdet_yolo.py`
- `backend/ml/configs/chestxdet_data.yaml`

Prepared output target:
- `backend/data/prepared/chestxdet_yolo`

### Current dataset status

What is already present:
- annotation JSON files
- class list
- conversion script
- YOLO folder structure

What is still missing:
- original image archives extracted into:
  - `references/ChestX-Det-Dataset/train_data`
  - `references/ChestX-Det-Dataset/test_data`

Because image files were not present when the prep step was first run:
- prepared `images/train` is currently empty
- prepared `images/val` is currently empty
- prepared `labels/train` is currently empty
- prepared `labels/val` is currently empty

### Current class names detected

- Atelectasis
- Calcification
- Cardiomegaly
- Consolidation
- Diffuse Nodule
- Effusion
- Emphysema
- Fibrosis
- Fracture
- Mass
- Nodule
- Pleural Thickening
- Pneumothorax

---

## 9. External References

### Ultralytics

Local path:
- `healthcare/Xray Assistant/references/ultralytics`

Purpose:
- YOLO11 framework reference
- predictor/runtime reference
- future training and adapter reference

### ChestX-Det-Dataset

Local path:
- `healthcare/Xray Assistant/references/ChestX-Det-Dataset`

Purpose:
- annotation source
- class taxonomy reference
- future YOLO fine-tuning preparation

---

## 10. Current Environment Variables

### Backend detection/runtime

- `APP_NAME`
- `APP_VERSION`
- `ENVIRONMENT`
- `XRAY_MODEL_PATH`
- `XRAY_CONFIDENCE_THRESHOLD`

### Backend GenAI / Bedrock

- `GENAI_PROVIDER`
- `BEDROCK_MODEL_ID`
- `AWS_DEFAULT_REGION`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `BEDROCK_TIMEOUT_SECONDS`

### Frontend

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_XRAY_USE_MOCK`

### Important note

The backend now reads env values from:
- `healthcare/Xray Assistant/.env`
- `healthcare/Xray Assistant/backend/.env`

This allows local root credentials to be reused while still supporting backend-specific overrides.

---

## 11. What Is Working

- backend project structure is in place
- frontend project structure is in place
- upstream references are cloned and isolated
- frontend and backend are wired to the same response schema
- real YOLO runtime integration exists
- trained ChestX-Det-based model artifact is prepared in a tracked deploy path
- annotated output generation exists
- frontend renders live inference results
- Bedrock enrichment is wired and locally validated with safe fallback behavior
- dataset conversion scaffolding exists
- Cloudera AI Python entrypoints exist for backend and frontend applications

---

## 12. What Is Not Finished Yet

- deployment validation inside Cloudera AI has not yet been executed
- frontend and backend applications still need final Application-level env configuration in Cloudera AI
- local/generated training artifacts remain intentionally excluded from deploy scope

---

## 13. Recommended Next Steps

1. Commit the tracked backend/frontend changes plus the deploy-ready `best.pt` model path.
2. Push the Xray Assist update to GitHub.
3. Create two Cloudera AI Applications using the provided Python entrypoints.
4. Set backend Bedrock credentials and model env vars in the Application configuration.
5. Validate end-to-end inference from the deployed frontend to the deployed backend.

---

## 14. Related Docs

- `docs/architecture.md`
- `docs/api-contract.md`
- `docs/demo-flow.md`
- `docs/baseline-repos.md`
- `docs/chestxdet-preparation.md`

End of project state.
