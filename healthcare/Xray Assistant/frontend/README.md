# Xray Assist Frontend

Healthcare chest X-ray review demo built on Next.js 15, Tailwind CSS, and TypeScript. Powered by Cloudera AI with AWS Bedrock for clinical enrichment.

## Run locally

```bash
cd "healthcare/Xray Assistant/frontend"
npm install --legacy-peer-deps
npm run dev
```

The app runs on port `3000` by default unless `PORT` or `CDSW_APP_PORT` is set.

## Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_XRAY_USE_MOCK=false
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Backend base URL for inference calls |
| `NEXT_PUBLIC_XRAY_USE_MOCK` | Set `true` for UI-only demo without backend |

## Demo flow

1. Upload a chest X-ray image (PNG or JPEG)
2. Select response language (English / Bahasa Indonesia)
3. Click **Analyze Image**
4. Progress indicator shows: **Uploading → Detecting → Generating**
5. Annotated image appears as soon as YOLO detection completes (~3s)
6. Full clinical summary, interpretation, and recommended actions load when LLM enrichment finishes
7. Click **Download Report** in the topbar to export a PDF clinical summary

## Key features

- **Streaming analysis** — SSE endpoint shows partial results in real time; annotated image appears before LLM summary
- **Radiology report-style Clinical Summary** — structured Finding / Impression / Clinical Note sections
- **Recommended Next Steps** with amber "Initial Assessment Only" disclaimer
- **PDF report download** — full branded clinical summary via html2canvas + jsPDF
- **Cloudera sidebar** — brand grid pattern decoration + Help button at bottom-right
- **Bilingual support** — English and Bahasa Indonesia via Bedrock prompt
- **Mock mode** — built-in mock response for UI demos without a running backend

## Component overview

| Component | Purpose |
|---|---|
| `app/page.tsx` | Main page — state, streaming handler, layout |
| `components/xray-upload.tsx` | Upload panel with language selector and CTA |
| `components/analysis-progress-bar.tsx` | Step indicator during streaming analysis |
| `components/annotated-image-card.tsx` | Annotated X-ray result image |
| `components/detection-summary-card.tsx` | Clinical Summary (Finding / Impression / Clinical Note) |
| `components/explanation-card.tsx` | Clinical Interpretation |
| `components/action-items-card.tsx` | Recommended Next Steps + disclaimer |
| `components/report-template.tsx` | Off-screen PDF report layout (inline styles) |
| `lib/api.ts` | Backend API client + SSE stream consumer |
| `lib/download-report.ts` | html2canvas + jsPDF PDF export utility |
| `components/ui/shell.tsx` | AppShell, AppSidebar (with grid decoration), topbar |
