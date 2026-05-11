import SummarizeIcon from "@mui/icons-material/Summarize";

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
        icon={<SummarizeIcon sx={{ fontSize: 20 }} />}
      />

      {result ? (
        <>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-4 py-3">
              <span className="text-[11px] font-medium text-[var(--color-ink-subtle)]">Case reference</span>
              <p className="mt-1 break-all text-sm font-semibold text-[var(--color-ink-strong)]">{result.case_id}</p>
            </div>
            <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-4 py-3">
              <span className="text-[11px] font-medium text-[var(--color-ink-subtle)]">Model status</span>
              <p className="mt-1 text-sm font-semibold text-[var(--color-ink-strong)]">Detection model active</p>
            </div>
          </div>

          <div className="mt-4 rounded-[18px] border border-[var(--color-soft-neutral-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f5f7fc_100%)] p-4">
            <p className="text-xs font-medium text-[var(--color-ink-subtle)]">Impression</p>
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
