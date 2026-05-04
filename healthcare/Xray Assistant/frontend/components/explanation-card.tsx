import { PanelCard, PanelHeader } from "./ui/card";

interface ExplanationCardProps {
  explanation: string | null;
  loading?: boolean;
}

export function ExplanationCard({ explanation, loading = false }: ExplanationCardProps) {
  return (
    <PanelCard className="p-6">
      <PanelHeader
        title="Explanation"
        subtitle="Plain-language reasoning for the displayed finding."
      />
      <p className="mt-5 text-sm leading-7 text-[var(--color-ink-muted)]">
        {explanation || (loading
          ? "Explanation will appear here while the image is being analyzed."
          : "Run analysis to generate a short explanation for the current image.")}
      </p>
    </PanelCard>
  );
}
