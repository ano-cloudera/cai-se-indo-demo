"use client";

import type { AnalyticsEventRecord, AnalyticsSummaryResponse } from "@/lib/api";

interface UsageDashboardPanelProps {
  loading: boolean;
  error: string;
  summary: AnalyticsSummaryResponse | null;
  events: AnalyticsEventRecord[];
  onRefresh: () => void;
}

function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value);
}

function formatDate(value?: string | null): string {
  if (!value) return "No activity yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No activity yet";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function UsageDashboardPanel({
  loading,
  error,
  summary,
  events,
  onRefresh,
}: UsageDashboardPanelProps) {
  const metrics = [
    { label: "Active sessions", value: summary ? formatCompact(summary.total_sessions) : "—" },
    { label: "Questions", value: summary ? formatCompact(summary.total_questions) : "—" },
    { label: "SQL requests", value: summary ? formatCompact(summary.sql_requests) : "—" },
    { label: "Guardrails blocks", value: summary ? formatCompact(summary.guardrails_blocks) : "—" },
    { label: "Visual responses", value: summary ? formatCompact(summary.visualization_responses) : "—" },
    { label: "Estimated tokens", value: summary ? formatCompact(summary.estimated_total_tokens) : "—" },
  ];

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-[var(--color-border-soft)] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] p-6 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4968cf]">
              Usage Dashboard
            </p>
            <h3 className="mt-3 font-headline text-[34px] font-bold leading-[1.04] text-[var(--color-ink-strong)]">
              Adoption And Activity Overview
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--color-ink-muted)]">
              This section summarizes recent session activity, model routing, guardrails interventions, and estimated token consumption without depending on AI-generated explanation.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink-muted)] transition hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)]"
          >
            Refresh Dashboard
          </button>
        </div>

        {error ? (
          <div className="mt-5 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map((metric) => (
            <section
              key={metric.label}
              className="rounded-[18px] border border-[var(--color-border-soft)] bg-white px-5 py-4"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-ink-subtle)]">
                {metric.label}
              </p>
              <p className="mt-3 font-headline text-[30px] font-bold text-[var(--color-ink-strong)]">
                {loading ? "…" : metric.value}
              </p>
            </section>
          ))}
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[22px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-panel">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-subtle)]">
                Recent Activity
              </p>
              <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
                Latest event: {summary ? formatDate(summary.latest_event_at) : "No activity yet"}
              </p>
            </div>
            {loading ? (
              <span className="text-xs font-semibold text-[var(--color-ink-subtle)]">Loading…</span>
            ) : null}
          </div>

          <div className="mt-4 overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]">
            <div className="grid grid-cols-[1.25fr_0.95fr_1fr_0.8fr] gap-3 border-b border-[var(--color-border-soft)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
              <span>Question</span>
              <span>Mode</span>
              <span>Model</span>
              <span>Time</span>
            </div>
            <div className="divide-y divide-[var(--color-border-soft)]">
              {events.length === 0 && !loading ? (
                <div className="px-4 py-5 text-sm text-[var(--color-ink-muted)]">
                  No events recorded yet.
                </div>
              ) : null}
              {events.map((event) => (
                <div
                  key={event.event_id}
                  className="grid grid-cols-[1.25fr_0.95fr_1fr_0.8fr] gap-3 px-4 py-3 text-sm text-[var(--color-ink-muted)]"
                >
                  <div>
                    <p className="font-medium text-[var(--color-ink-strong)]">
                      {event.question_excerpt || event.event_type}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                      {event.visualization_type
                        ? `Visual ${event.visualization_type}`
                        : event.guardrails_action
                          ? `Guardrails ${event.guardrails_action}`
                          : event.endpoint}
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-subtle)]">
                    {event.mode || "n/a"}
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-ink-subtle)]">
                    {event.model_name || event.provider || "Default"}
                  </span>
                  <span className="text-xs text-[var(--color-ink-subtle)]">
                    {formatDate(event.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <div className="rounded-[22px] border border-[var(--color-border-soft)] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] p-5 shadow-panel">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4968cf]">
              Provider Usage
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {summary?.provider_breakdown.length ? (
                summary.provider_breakdown.map((item) => (
                  <span
                    key={item.provider}
                    className="rounded-full border border-[var(--color-border-soft)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)]"
                  >
                    {item.provider} · {formatCompact(item.count)}
                  </span>
                ))
              ) : (
                <span className="text-sm text-[var(--color-ink-muted)]">
                  No provider activity yet.
                </span>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-panel">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-subtle)]">
              Mode Breakdown
            </p>
            <div className="mt-4 space-y-3">
              {summary?.mode_breakdown.length ? (
                summary.mode_breakdown.map((item) => (
                  <div
                    key={item.mode}
                    className="flex items-center justify-between rounded-[14px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-4 py-3 text-sm"
                  >
                    <span className="font-medium text-[var(--color-ink-muted)]">{item.mode}</span>
                    <span className="font-semibold text-[var(--color-ink-strong)]">
                      {formatCompact(item.count)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-[var(--color-ink-muted)]">
                  No mode breakdown available yet.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[22px] border border-[var(--color-border-soft)] bg-[#0d0a62] p-5 text-white shadow-panel">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
              Notes
            </p>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-white/80">
              <li>Estimated tokens are derived from message length so Azure and Bedrock remain comparable in one dashboard.</li>
              <li>Provider usage reflects non-RAG routing. RAG Studio stays tracked as its own mode.</li>
              <li>Guardrails blocks count requests intentionally stopped before sensitive data was returned.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
