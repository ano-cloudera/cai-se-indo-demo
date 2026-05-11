"use client";

import ArticleIcon from "@mui/icons-material/Article";
import DownloadIcon from "@mui/icons-material/Download";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import MonitorHeartIcon from "@mui/icons-material/MonitorHeart";
import { useEffect, useRef, useState } from "react";

import { ActionItemsCard } from "../components/action-items-card";
import { AnnotatedImageCard } from "../components/annotated-image-card";
import { BrandLogo } from "../components/brand-logo";
import { DetectionSummaryCard } from "../components/detection-summary-card";
import { ExecutiveSummaryStrip } from "../components/executive-summary-strip";
import { ExplanationCard } from "../components/explanation-card";
import { NoticePanel } from "../components/notice-panel";
import { ReportTemplate } from "../components/report-template";
import { XrayPreview } from "../components/xray-preview";
import { XrayUpload } from "../components/xray-upload";
import { PanelCard, PanelHeader, StatCard } from "../components/ui/card";
import { AppShell, AppSidebar, AppTopHeader, PageCanvas, SidebarNavButton } from "../components/ui/shell";
import { xrayApi, type AnalysisProgress, type AnalysisStep, type InferenceResponse, type ResponseLanguage, type XrayUiState } from "../lib/api";
import { AnalysisProgressBar } from "../components/analysis-progress-bar";
import { downloadReport } from "../lib/download-report";

const navItems = [
  {
    key: "demo",
    label: "Demo",
    icon: <ArticleIcon sx={{ fontSize: 22 }} />,
    active: true,
  },
];

function getSeverityTone(severity: string | undefined) {
  switch ((severity ?? "").toLowerCase()) {
    case "high":
      return "scorecard-soft-rose";
    case "medium":
      return "scorecard-soft-amber";
    case "low":
      return "scorecard-soft-green";
    default:
      return "scorecard-soft-neutral";
  }
}

function getStatusTone(status: string | undefined, loading: boolean, hasError: boolean) {
  if (loading) return "scorecard-soft-blue";
  if (hasError) return "scorecard-soft-rose";
  switch ((status ?? "").toLowerCase()) {
    case "success":
    case "ready":
      return "scorecard-soft-green";
    case "error":
    case "failed":
      return "scorecard-soft-rose";
    default:
      return "scorecard-soft-neutral";
  }
}

function getConfidenceTone(confidence: number | null) {
  if (confidence === null) return "scorecard-soft-neutral";
  if (confidence >= 0.85) return "scorecard-soft-green";
  if (confidence >= 0.6) return "scorecard-soft-amber";
  return "scorecard-soft-rose";
}

function getFindingTone(finding: string | undefined) {
  if (!finding) return "scorecard-soft-neutral";
  const lower = finding.toLowerCase();
  if (lower.includes("normal") || lower.includes("clear")) return "scorecard-soft-green";
  if (lower.includes("pneumonia") || lower.includes("effusion") || lower.includes("opacity")) return "scorecard-soft-rose";
  return "scorecard-soft-amber";
}

function formatConfidence(confidence: number | null) {
  if (confidence === null) return "—";
  return `${Math.round(confidence * 100)}%`;
}

function buildReviewNote(label: string, confidence: number) {
  const confidencePercent = Math.round(confidence * 100);
  return `${label} flagged for clinical review support at ${confidencePercent}% confidence.`;
}

function getUiState({
  selectedFile,
  loading,
  error,
  result,
}: {
  selectedFile: File | null;
  loading: boolean;
  error: string;
  result: InferenceResponse | null;
}): XrayUiState {
  if (loading) return "analyzing";
  if (error) return "error";
  if (result) return "success";
  if (selectedFile) return "selected";
  return "idle";
}

export default function Page() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>("uploading");
  const [partialResult, setPartialResult] = useState<Partial<InferenceResponse> | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<InferenceResponse | null>(null);
  const [responseLanguage, setResponseLanguage] = useState<ResponseLanguage>("en");
  const [helpOpen, setHelpOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const resultAnchorRef = useRef<HTMLDivElement | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const uiState = getUiState({ selectedFile, loading, error, result });
  const modeLabel = xrayApi.useMockMode() ? "Mock" : "Backend";
  const reportTimestamp = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const statusLabel =
    uiState === "analyzing"
      ? "Analyzing"
      : uiState === "error"
        ? "Error"
        : result?.status
          ? `${result.status.charAt(0).toUpperCase()}${result.status.slice(1)}`
          : "Ready";

  useEffect(() => {
    if (!selectedFile) {
      setPreviewUrl(null);
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  useEffect(() => {
    if (uiState !== "success" || !resultAnchorRef.current) return;
    resultAnchorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [uiState]);

  async function handleSubmit() {
    if (!selectedFile) {
      setError("Choose a chest X-ray image before starting inference.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setPartialResult(null);
    setAnalysisStep("uploading");

    try {
      const response = await xrayApi.infer(
        selectedFile,
        responseLanguage,
        (progress: AnalysisProgress) => {
          setAnalysisStep(progress.step);
          if (progress.partialResult) setPartialResult(progress.partialResult);
        },
      );
      setResult(response);
      setAnalysisStep("done");
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to process the X-ray right now.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleFileSelect(file: File | null) {
    setSelectedFile(file);
    setError("");
    if (!file) setResult(null);
  }

  async function handleDownload() {
    if (!reportRef.current || !result) return;
    setDownloading(true);
    try {
      const filename = `xray-report-${result.case_id}.pdf`;
      await downloadReport(reportRef.current, filename);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <>
    <AppShell
      sidebar={
        <AppSidebar
          brand={<BrandLogo />}
          items={navItems}
          footer={
            <SidebarNavButton
              active={helpOpen}
              label="Help"
              icon={<HelpOutlineIcon sx={{ fontSize: 22 }} />}
              onClick={() => setHelpOpen((value) => !value)}
            />
          }
        />
      }
      header={
        <AppTopHeader
          left={
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-action-soft)] text-[var(--color-action-primary)]">
                <MonitorHeartIcon sx={{ fontSize: 20 }} />
              </span>
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
                <h2 className="font-headline text-[1.2rem] font-bold leading-tight tracking-[-0.025em] text-[var(--color-ink-strong)]">
                  Xray Assist
                </h2>
                <span className="text-[var(--color-ink-subtle)] text-sm select-none">·</span>
                <p className="text-[0.82rem] font-medium leading-tight text-[var(--color-ink-subtle)]">
                  Structured chest X-ray review and action-oriented output.
                </p>
              </div>
            </div>
          }
          right={
            <div className="flex flex-wrap items-center gap-2">
              <span className="topbar-chip topbar-chip--subtle">
                {modeLabel} Mode
              </span>
              {result ? (
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={downloading}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#5c63f2] px-3.5 py-1.5 text-xs font-semibold text-[#5c63f2] transition hover:bg-[#5c63f2] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <DownloadIcon sx={{ fontSize: 14 }} />
                  {downloading ? "Generating…" : "Download Report"}
                </button>
              ) : null}
            </div>
          }
        />
      }
    >
      <PageCanvas>
        <div className="page-header-block" ref={resultAnchorRef}>
          <div className="metric-grid metric-grid-compact">
            <StatCard
              label="Finding"
              value={result?.finding ?? "Awaiting"}
              toneClassName={getFindingTone(result?.finding)}
            />
            <StatCard
              label="Confidence"
              value={formatConfidence(result?.confidence ?? null)}
              toneClassName={getConfidenceTone(result?.confidence ?? null)}
            />
            <StatCard
              label="Severity"
              value={result?.severity ?? "Pending"}
              toneClassName={getSeverityTone(result?.severity)}
            />
            <StatCard
              label="Status"
              value={statusLabel}
              toneClassName={getStatusTone(result?.status, loading, Boolean(error))}
            />
          </div>
          <ExecutiveSummaryStrip result={result} />
        </div>

        <div className="panel-grid xl:grid xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.95fr)]">
          <div className="stack-panel">
            <XrayUpload
              selectedFileName={selectedFile?.name ?? ""}
              loading={loading}
              responseLanguage={responseLanguage}
              onLanguageChange={setResponseLanguage}
              onFileSelect={handleFileSelect}
              onSubmit={handleSubmit}
            />

            <AnalysisProgressBar step={analysisStep} visible={loading} />

            {helpOpen ? (
              <NoticePanel
                title="How To Use This Demo"
                message="Select a chest X-ray image, confirm the preview, choose the response language, then run the analysis."
                tone="empty"
                suggestion="Review the finding, clinical interpretation, and recommended actions after the result image is generated."
              />
            ) : null}

            {error ? (
              <NoticePanel
                title="Inference Error"
                message={error}
                tone="error"
                suggestion="Check frontend mode, backend availability, and uploaded file type."
              />
            ) : null}

            <div className="grid gap-6 xl:grid-cols-2">
              <XrayPreview previewUrl={previewUrl} />
              <AnnotatedImageCard
                imageUrl={result?.annotated_image_path ?? partialResult?.annotated_image_path ?? null}
                loading={loading && !partialResult?.annotated_image_path}
              />
            </div>

            <PanelCard className="p-6">
              <PanelHeader
                title="Findings Overview"
                subtitle="A concise summary of the findings surfaced for review."
              />
              {result ? (
                <div className="mt-5 overflow-hidden rounded-[20px] border border-[var(--color-border-soft)]">
                  <table className="min-w-full divide-y divide-[var(--color-border-soft)] text-sm">
                    <thead className="bg-[var(--color-surface-muted)]">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-[var(--color-ink-strong)]">Finding</th>
                        <th className="px-4 py-3 text-left font-semibold text-[var(--color-ink-strong)]">Confidence</th>
                        <th className="px-4 py-3 text-left font-semibold text-[var(--color-ink-strong)]">Review Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--color-border-soft)] bg-white">
                      {result.detections.length > 0 ? (
                        result.detections.map((item, index) => (
                          <tr key={`${item.label}-${index}`}>
                            <td className="px-4 py-3 text-[var(--color-ink-strong)]">{item.label}</td>
                            <td className="px-4 py-3 text-[var(--color-ink-muted)]">{Math.round(item.confidence * 100)}%</td>
                            <td className="px-4 py-3 text-[var(--color-ink-muted)]">{buildReviewNote(item.label, item.confidence)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={3} className="px-4 py-6 text-center text-[var(--color-ink-subtle)]">
                            No findings were surfaced for review from this image.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="mt-5">
                  <NoticePanel
                    title="No results yet"
                    message="Upload a chest X-ray to populate detections, the clinical summary, and recommended next steps."
                    tone="empty"
                  />
                </div>
              )}
            </PanelCard>
          </div>

          <div className="sticky-rail mt-6 xl:mt-0">
            <DetectionSummaryCard result={result} loading={loading} />
            <ExplanationCard explanation={result?.explanation ?? null} loading={loading} />
            <ActionItemsCard items={result?.action_items ?? []} loading={loading} />
          </div>
        </div>
      </PageCanvas>
    </AppShell>

    {/* Off-screen report template — captured by html2canvas on download */}
    <div style={{ position: "absolute", top: 0, left: "-9999px", opacity: 0, pointerEvents: "none", zIndex: -1 }}>
      {result ? (
        <ReportTemplate
          ref={reportRef}
          result={result}
          previewUrl={previewUrl}
          timestamp={reportTimestamp}
        />
      ) : (
        <div ref={reportRef} />
      )}
    </div>
    </>
  );
}
