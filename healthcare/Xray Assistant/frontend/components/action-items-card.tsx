import { PanelCard, PanelHeader } from "./ui/card";

interface ActionItemsCardProps {
  items: string[];
  loading?: boolean;
}

export function ActionItemsCard({ items, loading = false }: ActionItemsCardProps) {
  return (
    <PanelCard className="p-6">
      <PanelHeader
        title="Recommended Actions"
        subtitle="Suggested next steps for clinical review."
      />
      {items.length > 0 ? (
        <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-6 text-[var(--color-ink-muted)]">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ol>
      ) : (
        <p className="mt-5 text-sm leading-6 text-[var(--color-ink-muted)]">
          {loading
            ? "Recommended actions will appear here after the analysis completes."
            : "Recommended actions will appear here after you run analysis."}
        </p>
      )}
    </PanelCard>
  );
}
