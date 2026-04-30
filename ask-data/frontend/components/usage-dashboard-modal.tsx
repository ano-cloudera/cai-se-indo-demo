"use client";

import { useEffect } from "react";

import type { AnalyticsEventRecord, AnalyticsSummaryResponse } from "@/lib/api";

interface UsageDashboardModalProps {
  open: boolean;
  loading: boolean;
  error: string;
  summary: AnalyticsSummaryResponse | null;
  events: AnalyticsEventRecord[];
  onRefresh: () => void;
  onClose: () => void;
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

export function UsageDashboardModal({
  open,
  loading,
  error,
  summary,
  events,
  onRefresh,
  onClose,
}: UsageDashboardModalProps) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const metrics = [
    { label: "Active sessions", value: summary ? formatCompact(summary.total_sessions) : "—" },
    { label: "Questions", value: summary ? formatCompact(summary.total_questions) : "—" },
    { label: "SQL requests", value: summary ? formatCompact(summary.sql_requests) : "—" },
    { label: "Guardrails blocks", value: summary ? formatCompact(summary.guardrails_blocks) : "—" },
    { label: "Visual responses", value: summary ? formatCompact(summary.visualization_responses) : "—" },
    { label: "Estimated tokens", value: summary ? formatCompact(summary.estimated_total_tokens) : "—" },
  ];

  return (
    <div
      className="fixed inset-0 z-[74] overflow-y-auto bg-slate-950/40 p-3 sm:p-4 lg:p-6 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-auto my-2 flex min-h-[min(90vh,46rem)] w-full max-w-6xl overflow-hidden rounded-[28px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-[0_36px_80px_rgba(15,23,42,0.22)]">
        <div className="flex min-h-[min(90vh,46rem)] min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between border-b border-[var(--color-border-soft)] px-5 py-5 sm:px-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-subtle)]">
                Usage Dashboard
              </p>
              <h3 className="mt-2 font-headline text-[28px] font-bold leading-[1.08] text-[var(--color-ink-strong)]">
                Adoption And Activity Overview
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-ink-muted)]">
                This dashboard summarizes session activity, model usage, guardrails interventions, and estimated token consumption across the recent application window.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--color-ink-muted)] transition hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)]"
              >
                Refresh
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-[var(--radius-pill)] bg-[var(--color-action-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-action-primary-hover)]"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            {error ? (
              <div className="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {metrics.map((metric) => (
                <section
                  key={metric.label}
                  className="rounded-[20px] border border-[var(--color-border-soft)] bg-[linear-gradient(180deg,#ffffff_0%,#f8f9fd_100%)] px-5 py-4"
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

            <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-[22px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] p-5">
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

                <div className="mt-4 overflow-hidden rounded-[18px] border border-[var(--color-border-soft)] bg-white">
                  <div className="grid grid-cols-[1.2fr_1fr_0.9fr_0.8fr] gap-3 border-b border-[var(--color-border-soft)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-ink-subtle)]">
                    <span>Question</span>
                    <span>Mode</span>
                    <span>Provider</span>
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
                        className="grid grid-cols-[1.2fr_1fr_0.9fr_0.8fr] gap-3 px-4 py-3 text-sm text-[var(--color-ink-muted)]"
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
                <div className="rounded-[22px] border border-[var(--color-border-soft)] bg-[linear-gradient(180deg,#ffffff_0%,#f8f9fd_100%)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-subtle)]">
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

                <div className="rounded-[22px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
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

                <div className="rounded-[22px] border border-[var(--color-border-soft)] bg-[#0d0a62] p-5 text-white">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
                    Interpretation Notes
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                    <li>Estimated tokens are derived from message length for a stable cross-provider comparison.</li>
                    <li>Provider usage counts non-RAG model routing only. RAG Studio remains tracked as its own mode.</li>
                    <li>Guardrails blocks count requests that were intentionally stopped before sensitive data was returned.</li>
                  </ul>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
