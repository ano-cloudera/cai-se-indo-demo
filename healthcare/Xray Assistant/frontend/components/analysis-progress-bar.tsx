import type { AnalysisStep } from "../lib/api";

interface AnalysisProgressBarProps {
  step: AnalysisStep;
  visible: boolean;
}

const STEPS: { key: AnalysisStep; label: string; description: string }[] = [
  { key: "uploading", label: "Uploading", description: "Sending image to backend…" },
  { key: "detecting", label: "Detecting", description: "YOLO model scanning for findings…" },
  { key: "generating", label: "Generating", description: "AI generating clinical summary…" },
  { key: "done", label: "Complete", description: "Analysis ready." },
];

function stepIndex(step: AnalysisStep): number {
  return STEPS.findIndex((s) => s.key === step);
}

export function AnalysisProgressBar({ step, visible }: AnalysisProgressBarProps) {
  if (!visible) return null;

  const current = stepIndex(step);
  const currentStep = STEPS[current];

  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-border-soft)] bg-white px-5 py-4 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
          {currentStep?.label ?? "Analyzing"}
        </p>
        <p className="text-xs text-[var(--color-ink-subtle)]">
          {currentStep?.description ?? ""}
        </p>
      </div>

      {/* Step pills */}
      <div className="flex items-center gap-1.5">
        {STEPS.filter((s) => s.key !== "done").map((s, index) => {
          const state =
            index < current ? "done" : index === current ? "active" : "pending";
          return (
            <div key={s.key} className="flex flex-1 flex-col gap-1.5">
              <div
                className={[
                  "h-1.5 rounded-full transition-all duration-500",
                  state === "done"
                    ? "bg-[var(--color-action-primary)]"
                    : state === "active"
                      ? "animate-pulse bg-[var(--color-action-primary)] opacity-70"
                      : "bg-[var(--color-border-soft)]",
                ].join(" ")}
              />
              <p
                className={[
                  "text-[10px] font-semibold uppercase tracking-[0.08em]",
                  state === "pending"
                    ? "text-[var(--color-ink-subtle)]"
                    : "text-[var(--color-action-primary)]",
                ].join(" ")}
              >
                {s.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
