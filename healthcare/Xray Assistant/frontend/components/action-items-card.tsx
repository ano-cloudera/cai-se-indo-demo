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
        <div className="mt-5 space-y-3">
          {items.map((item, index) => (
            <div
              key={item}
              className="flex gap-3 rounded-[18px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-4 py-3"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[var(--color-action-primary)]">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-[var(--color-ink-muted)]">{item}</p>
            </div>
          ))}
        </div>
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
