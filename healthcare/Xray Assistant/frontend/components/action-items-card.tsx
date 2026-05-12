import { PanelCard, PanelHeader } from "./ui/card";

interface ActionItemsCardProps {
  items: string[];
  loading?: boolean;
}

const DISCLAIMER =
  "These recommendations are AI-generated for initial review support only. They do not constitute a clinical diagnosis or treatment plan. All findings must be validated by a qualified radiologist or licensed medical professional before any clinical action is taken.";

export function ActionItemsCard({ items, loading = false }: ActionItemsCardProps) {
  return (
    <PanelCard className="p-6">
      <PanelHeader
        title="Recommended Next Steps"
        subtitle="Initial review actions based on AI-detected findings."
      />
      {items.length > 0 ? (
        <>
          <div className="mt-5 space-y-2.5">
            {items.map((item, index) => (
              <div
                key={item}
                className="flex gap-3 rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-4 py-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-[var(--color-action-primary)] shadow-sm">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-[var(--color-ink-muted)]">{item}</p>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div className="mt-4 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-700">
              ⚠ Initial Assessment Only
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-amber-800">
              {DISCLAIMER}
            </p>
          </div>
        </>
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
