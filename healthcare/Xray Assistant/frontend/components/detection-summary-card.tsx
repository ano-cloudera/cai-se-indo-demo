import { PanelCard, PanelHeader } from "./ui/card";
import type { InferenceResponse } from "../lib/api";

interface DetectionSummaryCardProps {
  result: InferenceResponse | null;
  loading?: boolean;
}

export function DetectionSummaryCard({ result, loading = false }: DetectionSummaryCardProps) {
  return (
    <PanelCard className="p-6">
      <PanelHeader
        title="Clinical Summary"
        subtitle="Structured impression prepared for review."
        icon={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M4 4.75A1.75 1.75 0 0 1 5.75 3h8.5A1.75 1.75 0 0 1 16 4.75v10.5A1.75 1.75 0 0 1 14.25 17h-8.5A1.75 1.75 0 0 1 4 15.25V4.75Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M7 8.25h6M7 11.25h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        }
      />

      {result ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-subtle)]">Case Reference</span>
              <p className="mt-1 break-all text-sm font-semibold text-[var(--color-ink-strong)]">{result.case_id}</p>
            </div>
            <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-subtle)]">Model Status</span>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-strong)]">Detection model active</p>
            </div>
          </div>

          <div className="mt-4 rounded-[18px] border border-[var(--color-soft-neutral-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f5f7fc_100%)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-subtle)]">Impression</p>
            <p className="mt-2 text-sm leading-7 text-[var(--color-ink-muted)]">{result.summary}</p>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--color-ink-subtle)]">
            <span className="rounded-full border border-[var(--color-soft-blue-border)] bg-[var(--color-soft-blue)] px-3 py-1">
              {result.finding}
            </span>
            <span className="rounded-full border border-[var(--color-soft-amber-border)] bg-[var(--color-soft-amber)] px-3 py-1">
              {Math.round(result.confidence * 100)}% confidence
            </span>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-subtle)]">Framework</span>
              <span className="break-all text-right font-semibold text-[var(--color-ink-strong)]">{result.model_info.framework}</span>
            </div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-subtle)]">Runtime</span>
              <span className="break-all text-right font-semibold text-[var(--color-ink-strong)]">{result.model_info.version}</span>
            </div>
          </div>
        </>
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
