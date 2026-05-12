import SummarizeIcon from "@mui/icons-material/Summarize";

import { PanelCard, PanelHeader } from "./ui/card";
import type { InferenceResponse } from "../lib/api";

interface DetectionSummaryCardProps {
  result: InferenceResponse | null;
  loading?: boolean;
}

function severityBadgeClass(severity: string | undefined): string {
  switch ((severity ?? "").toLowerCase()) {
    case "high":   return "border-[var(--color-soft-rose-border)] bg-[var(--color-soft-rose)] text-red-700";
    case "medium": return "border-[var(--color-soft-amber-border)] bg-[var(--color-soft-amber)] text-amber-700";
    case "low":    return "border-[var(--color-soft-green-border)] bg-[var(--color-soft-green)] text-green-700";
    default:       return "border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] text-[var(--color-ink-subtle)]";
  }
}

function capitalize(s: string): string {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

export function DetectionSummaryCard({ result, loading = false }: DetectionSummaryCardProps) {
  return (
    <PanelCard className="p-6">
      <PanelHeader
        title="Clinical Summary"
        subtitle="Structured impression prepared for review."
        icon={<SummarizeIcon sx={{ fontSize: 20 }} />}
      />

      {result ? (
        <div className="mt-5 space-y-4">
          {/* FINDING row */}
          <div>
            <p className="meta-kicker mb-2">Finding</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-base font-bold text-[var(--color-ink-strong)]">
                {capitalize(result.finding)}
              </span>
              <span className="text-[var(--color-ink-subtle)]">·</span>
              <span className="rounded-full border border-[var(--color-soft-blue-border)] bg-[var(--color-soft-blue)] px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                {Math.round(result.confidence * 100)}% confidence
              </span>
              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${severityBadgeClass(result.severity)}`}>
                {capitalize(result.severity)}
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-[var(--color-border-soft)]" />

          {/* IMPRESSION */}
          <div>
            <p className="meta-kicker mb-2">Impression</p>
            <div className="rounded-[16px] border border-[var(--color-soft-neutral-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f5f7fc_100%)] p-4">
              <p className="text-sm leading-7 text-[var(--color-ink-muted)]">{result.summary}</p>
            </div>
          </div>

          {/* CLINICAL NOTE */}
          <div>
            <p className="meta-kicker mb-2">Clinical Note</p>
            <div className="rounded-[16px] border border-[var(--color-soft-blue-border)] bg-[var(--color-soft-blue)] p-4">
              <p className="text-sm leading-6 text-blue-800">
                Findings should be correlated with clinical history and physical examination. Specialist radiologist review is recommended before any clinical action is taken.
              </p>
            </div>
          </div>

          {/* Inline disclaimer */}
          <p className="text-[10px] italic leading-5 text-[var(--color-ink-subtle)]">
            AI-generated · For initial review support only · Not a clinical diagnosis
          </p>
        </div>
      ) : (
        <div className="mt-5 rounded-[18px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] p-4">
          <p className="text-sm leading-6 text-[var(--color-ink-muted)]">
            {loading
              ? "Clinical summary will appear here once the image analysis completes."
              : "Upload an image and run analysis to generate the clinical summary."}
          </p>
        </div>
      )}
    </PanelCard>
  );
}
