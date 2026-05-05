import { PanelCard, PanelHeader } from "./ui/card";

interface ExplanationCardProps {
  explanation: string | null;
  loading?: boolean;
}

export function ExplanationCard({ explanation, loading = false }: ExplanationCardProps) {
  return (
    <PanelCard className="border-[var(--color-soft-blue-border)] bg-[linear-gradient(180deg,#ffffff_0%,#f3f7ff_100%)] p-6">
      <PanelHeader
        title="Clinical Interpretation"
        subtitle="Specialist-style explanation for clinical review support."
        icon={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path d="M6 4.5A2.5 2.5 0 0 1 8.5 2h3A2.5 2.5 0 0 1 14 4.5v11A2.5 2.5 0 0 1 11.5 18h-3A2.5 2.5 0 0 1 6 15.5v-11Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8.25 6.75h3.5M8.25 10h3.5M8.25 13.25h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        }
      />
      <div className="mt-5 rounded-[18px] border border-[var(--color-soft-blue-border)] bg-white/85 p-4">
        <p className="text-sm leading-7 text-[var(--color-ink-muted)]">
          {explanation || (loading
            ? "Clinical interpretation will appear here while the image is being analyzed."
            : "Run analysis to generate a concise specialist-style interpretation for the current image.")}
        </p>
      </div>
    </PanelCard>
  );
}
