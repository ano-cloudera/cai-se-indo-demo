# Xray Assist Frontend

This frontend adapts the existing `ask-data/frontend` template into a healthcare chest X-ray demo while preserving the original logo, shell layout, visual language, and overall page feel.

## Run locally

```bash
cd "/Users/trianonurhikmat/Documents/Works/cloudera/cai-se-indo-demo/healthcare/Xray Assistant/frontend"
npm install
npm run dev
```

The app runs on port `3000` by default unless `PORT` or `CDSW_APP_PORT` is set.

## Modes

The frontend is ready to call the backend inference API directly. Mock mode remains available when you need a UI-only demo.

Create `.env.local` with:

```env
NEXT_PUBLIC_XRAY_USE_MOCK=false
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

- `NEXT_PUBLIC_XRAY_USE_MOCK=false`
  Sends the selected file to backend `POST /api/v1/infer`.
- `NEXT_PUBLIC_XRAY_USE_MOCK=true`
  Uses a built-in mock response.
- `NEXT_PUBLIC_API_BASE_URL`
  Backend base URL used when mock mode is disabled.

## Current flow

1. Choose a chest X-ray image.
2. Preview the selected image immediately.
3. Submit for analysis.
4. Render live scorecards, detection results, the clinical summary, explanation, actions, and annotated output when available.
