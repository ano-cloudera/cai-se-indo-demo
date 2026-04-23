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

function formatAxisLabel(label: string): string {
  const isoDate = /^\d{4}-\d{2}-\d{2}$/;
  const isoMonth = /^\d{4}-\d{2}$/;

  if (isoDate.test(label)) {
    const date = new Date(`${label}T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
      }).format(date);
    }
  }

  if (isoMonth.test(label)) {
    const date = new Date(`${label}-01T00:00:00`);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        year: "numeric",
      }).format(date);
    }
  }

  return label;
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

function buildYAxisTicks(min: number, max: number): number[] {
  if (max === min) return [max, max];
  const midpoint = min + (max - min) / 2;
  return [max, midpoint, min];
}

function buildXAxisTicks(points: DataPoint[]): DataPoint[] {
  if (points.length <= 4) return points;
  const indices = new Set([
    0,
    Math.floor((points.length - 1) / 3),
    Math.floor(((points.length - 1) * 2) / 3),
    points.length - 1,
  ]);
  return points.filter((_, index) => indices.has(index));
}

function buildLineGeometry(points: DataPoint[]) {
  const width = 100;
  const height = 64;
  const leftPad = 6;
  const rightPad = 2;
  const topPad = 6;
  const bottomPad = 8;
  const values = points.map((point) => point.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);

  const coords = points.map((point, index) => {
    const x = points.length === 1
      ? width / 2
      : leftPad + (index / (points.length - 1)) * (width - leftPad - rightPad);
    const y = topPad + ((max - point.value) / range) * (height - topPad - bottomPad);
    return { ...point, x, y };
  });

  const linePath = coords
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ");

  const areaPath = coords.length === 0
    ? ""
    : [
        `M ${coords[0].x.toFixed(2)} ${(height - bottomPad).toFixed(2)}`,
        ...coords.map((point) => `L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`),
        `L ${coords[coords.length - 1].x.toFixed(2)} ${(height - bottomPad).toFixed(2)}`,
        "Z",
      ].join(" ");

  return {
    width,
    height,
    bottomPad,
    coords,
    linePath,
    areaPath,
    min,
    max,
  };
}

export function ResultChartCard({ visualization }: ResultChartCardProps) {
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
  const total = boundedPoints.reduce((sum, point) => sum + point.value, 0);
  const firstPoint = boundedPoints[0];
  const lastPoint = boundedPoints[boundedPoints.length - 1];
  const delta = lastPoint.value - firstPoint.value;
  const trendDirection = delta > 0 ? "Upward trend" : delta < 0 ? "Soft decline" : "Stable trend";
  const lineGeometry = kind === "line" ? buildLineGeometry(boundedPoints) : null;
  const yAxisTicks = lineGeometry ? buildYAxisTicks(lineGeometry.min, lineGeometry.max) : [];
  const xAxisTicks = buildXAxisTicks(boundedPoints);

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
        <div className="rounded-[18px] border border-[var(--color-border-soft)] bg-white/70 p-5">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[14px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-subtle)]">
                Latest Value
              </p>
              <p className="mt-1 text-lg font-bold text-[var(--color-ink-strong)]">{formatValue(lastPoint.value)}</p>
            </div>
            <div className="rounded-[14px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-subtle)]">
                Net Change
              </p>
              <p className={`mt-1 text-lg font-bold ${delta >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {delta >= 0 ? "+" : ""}{formatValue(delta)}
              </p>
            </div>
            <div className="rounded-[14px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-subtle)]">
                Reading
              </p>
              <p className="mt-1 text-lg font-bold text-[var(--color-ink-strong)]">{trendDirection}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[4rem_minmax(0,1fr)]">
            <div className="hidden lg:flex lg:flex-col lg:justify-between lg:pb-8">
              {yAxisTicks.map((tick, index) => (
                <span key={`${tick}-${index}`} className="text-right text-xs font-medium text-[var(--color-ink-subtle)]">
                  {formatValue(tick)}
                </span>
              ))}
            </div>
            <div>
              <div className="h-56 w-full rounded-[16px] border border-[var(--color-border-soft)] bg-[linear-gradient(180deg,#fbfcff_0%,#f4f7ff_100%)] p-4">
                <svg
                  viewBox={`0 0 ${lineGeometry?.width ?? 100} ${lineGeometry?.height ?? 64}`}
                  className="h-full w-full overflow-visible"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="chartStroke" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#5c63f2" />
                      <stop offset="100%" stopColor="#ff7a2f" />
                    </linearGradient>
                    <linearGradient id="chartArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="rgba(92,99,242,0.22)" />
                      <stop offset="100%" stopColor="rgba(92,99,242,0.02)" />
                    </linearGradient>
                  </defs>

                  {[16, 32, 48].map((y) => (
                    <path
                      key={y}
                      d={`M 0 ${y} H ${lineGeometry?.width ?? 100}`}
                      stroke="#dfe5f3"
                      strokeWidth="0.7"
                      strokeDasharray="2 3"
                    />
                  ))}

                  {lineGeometry?.areaPath ? <path d={lineGeometry.areaPath} fill="url(#chartArea)" /> : null}
                  {lineGeometry?.linePath ? (
                    <path
                      d={lineGeometry.linePath}
                      fill="none"
                      stroke="url(#chartStroke)"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : null}

                  {lineGeometry?.coords.map((point) => (
                    <g key={point.label}>
                      <circle cx={point.x} cy={point.y} r="3.8" fill="white" stroke="#5c63f2" strokeWidth="2" />
                      <circle cx={point.x} cy={point.y} r="1.5" fill="#5c63f2" />
                    </g>
                  ))}
                </svg>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {xAxisTicks.map((point) => (
                  <div key={point.label} className="rounded-[14px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-2">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-ink-subtle)]">
                      {formatAxisLabel(point.label)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[var(--color-ink-strong)]">{formatValue(point.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-[14px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-3">
            <p className="text-sm text-[var(--color-ink-muted)]">
              The latest plotted point is <span className="font-semibold text-[var(--color-ink-strong)]">{formatAxisLabel(lastPoint.label)}</span> with a value of{" "}
              <span className="font-semibold text-[var(--color-ink-strong)]">{formatValue(lastPoint.value)}</span>.
            </p>
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
