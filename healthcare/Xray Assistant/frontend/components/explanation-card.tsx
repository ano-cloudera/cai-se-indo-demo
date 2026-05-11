import BiotechIcon from "@mui/icons-material/Biotech";

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
        icon={<BiotechIcon sx={{ fontSize: 20 }} />}
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
