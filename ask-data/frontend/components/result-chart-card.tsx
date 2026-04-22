import type { ReactNode } from "react";

import type { VisualizationSpec } from "@/lib/api";

type DataPoint = {
  label: string;
  value: number;
};

interface ResultChartCardProps {
  visualization: VisualizationSpec;
}

function formatValue(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}

function buildLinePath(points: DataPoint[]): string {
  if (points.length === 0) return "";

  const max = Math.max(...points.map((point) => point.value), 1);
  const width = 100;
  const height = 44;

  return points
    .map((point, index) => {
      const x = points.length === 1 ? width / 2 : (index / (points.length - 1)) * width;
      const y = height - (point.value / max) * height;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function renderHeader(title: string, subtitle: string): ReactNode {
  return (
    <div className="mb-5 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]">
          Visual Insight
        </p>
        <h3 className="mt-1 font-headline text-lg font-bold text-[var(--color-ink-strong)]">
          {title}
        </h3>
      </div>
      <span className="rounded-full bg-[rgba(92,99,242,0.1)] px-3 py-1 text-xs font-semibold text-[#4953d3]">
        {subtitle}
      </span>
    </div>
  );
}

export function ResultChartCard({
  visualization,
}: ResultChartCardProps) {
  const kind = visualization.type;
  const xKey = visualization.x_key;
  const yKey = visualization.y_key;
  const points: DataPoint[] = !xKey || !yKey
    ? []
    : visualization.series
      .map((item) => {
        const rawValue = item[yKey];
        const value = typeof rawValue === "number" ? rawValue : Number(rawValue);
        if (!Number.isFinite(value)) return null;
        return {
          label: String(item[xKey] ?? "Unknown"),
          value,
        };
      })
      .filter((point): point is DataPoint => point !== null);

  if (points.length < 2) return null;

  const boundedPoints = points.slice(0, 8);
  const max = Math.max(...boundedPoints.map((point) => point.value), 1);
  const min = Math.min(...boundedPoints.map((point) => point.value));
  const linePath = kind === "line" ? buildLinePath(boundedPoints) : "";
  const total = boundedPoints.reduce((sum, point) => sum + point.value, 0);

  return (
    <section className="w-full max-w-[56rem] rounded-[var(--radius-panel)] border border-[var(--color-border-soft)] bg-[linear-gradient(180deg,#ffffff_0%,#f7f9ff_100%)] p-5 shadow-panel">
      {renderHeader(
        visualization.title ?? "Auto-generated chart from the latest SQL result",
        kind === "line" ? "Trend view" : kind === "pie" ? "Composition view" : "Comparison view",
      )}

      {kind === "bar" ? (
        <div className="space-y-3">
          {boundedPoints.map((point) => (
            <div key={point.label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3">
              <p className="truncate text-sm font-medium text-[var(--color-ink-muted)]">{point.label}</p>
              <div className="h-3 overflow-hidden rounded-full bg-[#e8ecf8]">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#5c63f2_0%,#7b82ff_100%)]"
                  style={{ width: `${Math.max((point.value / max) * 100, 8)}%` }}
                />
              </div>
              <p className="text-sm font-semibold text-[var(--color-ink-strong)]">{formatValue(point.value)}</p>
            </div>
          ))}
        </div>
      ) : kind === "line" ? (
        <div className="rounded-[18px] border border-[var(--color-border-soft)] bg-white/70 p-4">
          <div className="h-40 w-full">
            <svg viewBox="0 0 100 52" className="h-full w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
              <defs>
                <linearGradient id="chartStroke" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0%" stopColor="#5c63f2" />
                  <stop offset="100%" stopColor="#ff7a2f" />
                </linearGradient>
              </defs>
              <path d="M 0 48 H 100" stroke="#dfe5f3" strokeWidth="0.8" />
              <path d={linePath} fill="none" stroke="url(#chartStroke)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              {boundedPoints.map((point, index) => {
                const x = boundedPoints.length === 1 ? 50 : (index / (boundedPoints.length - 1)) * 100;
                const y = 44 - (point.value / max) * 44;
                return <circle key={point.label} cx={x} cy={y} r="2.4" fill="#5c63f2" />;
              })}
            </svg>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {boundedPoints.map((point) => (
              <div key={point.label} className="rounded-[14px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-2">
                <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-subtle)]">
                  {point.label}
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--color-ink-strong)]">{formatValue(point.value)}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {boundedPoints.map((point) => {
            const percent = total > 0 ? (point.value / total) * 100 : 0;
            return (
              <div key={point.label} className="rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-[var(--color-ink-strong)]">{point.label}</p>
                  <span className="text-sm font-semibold text-[#4953d3]">{percent.toFixed(1)}%</span>
                </div>
                <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#e8ecf8]">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#ff7a2f_0%,#5c63f2_100%)]"
                    style={{ width: `${Math.max(percent, 6)}%` }}
                  />
                </div>
                <p className="mt-3 text-sm text-[var(--color-ink-muted)]">Value {formatValue(point.value)}</p>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[var(--color-ink-subtle)]">
        <span className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1">
          {boundedPoints.length} plotted points
        </span>
        <span className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1">
          Range {formatValue(min)} to {formatValue(max)}
        </span>
      </div>
    </section>
  );
}
