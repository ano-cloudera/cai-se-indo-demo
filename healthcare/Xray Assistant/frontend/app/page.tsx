"use client";

import { useEffect, useRef, useState } from "react";

import { ActionItemsCard } from "../components/action-items-card";
import { AnnotatedImageCard } from "../components/annotated-image-card";
import { BrandLogo } from "../components/brand-logo";
import { DetectionSummaryCard } from "../components/detection-summary-card";
import { ExecutiveSummaryStrip } from "../components/executive-summary-strip";
import { ExplanationCard } from "../components/explanation-card";
import { NoticePanel } from "../components/notice-panel";
import { XrayPreview } from "../components/xray-preview";
import { XrayUpload } from "../components/xray-upload";
import { PanelCard, PanelHeader, StatCard } from "../components/ui/card";
import { AppShell, AppSidebar, AppTopHeader, PageCanvas, SidebarNavButton } from "../components/ui/shell";
import { xrayApi, type InferenceResponse, type ResponseLanguage, type XrayUiState } from "../lib/api";

const navItems = [
  {
    key: "demo",
    label: "Demo",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path
          d="M4 4.75A1.75 1.75 0 0 1 5.75 3h6.5L14 4.75v7.5A1.75 1.75 0 0 1 12.25 14h-6.5A1.75 1.75 0 0 1 4 12.25v-7.5Z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M6.75 7.25h4.5M6.75 10h3.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
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
      return "scorecard-soft-neutral";
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
  const [error, setError] = useState("");
  const [result, setResult] = useState<InferenceResponse | null>(null);
  const [responseLanguage, setResponseLanguage] = useState<ResponseLanguage>("en");
  const [helpOpen, setHelpOpen] = useState(false);
  const resultAnchorRef = useRef<HTMLDivElement | null>(null);
  const uiState = getUiState({ selectedFile, loading, error, result });
  const modeLabel = xrayApi.useMockMode() ? "Mock" : "Backend";
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

    try {
      const response = await xrayApi.infer(selectedFile, responseLanguage);
      setResult(response);
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

  return (
    <AppShell
      sidebar={
        <AppSidebar
          brand={<BrandLogo />}
          items={navItems}
          footer={
            <SidebarNavButton
              active={helpOpen}
              label="Help"
              icon={
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
                  <circle cx="9" cy="9" r="6.25" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M7.7 7.15a1.55 1.55 0 1 1 2.57 1.17c-.5.43-.92.74-.92 1.43" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M9 12.2h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                </svg>
              }
              onClick={() => setHelpOpen((value) => !value)}
            />
          }
        />
      }
      header={
        <AppTopHeader
          left={
            <div className="page-title-stack page-title-stack--simple">
              <h2 className="page-title text-[var(--color-ink-strong)]">
                Xray Assist
              </h2>
              <p className="page-subtitle">
                Structured chest X-ray review and action-oriented output.
              </p>
            </div>
          }
          right={
            <div className="flex flex-wrap items-center gap-2">
              <span className="topbar-chip topbar-chip--subtle">
                {modeLabel} Mode
              </span>
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
              value={result?.finding ?? "—"}
              detail="Primary clinical finding from the latest analysis."
              toneClassName="scorecard-soft-neutral"
            />
            <StatCard
              label="Confidence"
              value={formatConfidence(result?.confidence ?? null)}
              detail="Highest model confidence returned for this image."
              toneClassName="scorecard-soft-blue"
            />
            <StatCard
              label="Severity"
              value={result?.severity ?? "—"}
              detail="Risk level derived from the analysis result."
              toneClassName={getSeverityTone(result?.severity)}
            />
            <StatCard
              label="Status"
              value={statusLabel}
              detail="Current system state for the submitted image."
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
                imageUrl={result?.annotated_image_path ?? null}
                loading={loading}
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
  );
}
