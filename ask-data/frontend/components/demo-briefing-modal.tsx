"use client";

import { useEffect } from "react";

type BriefingSection = {
  id: string;
  label: string;
  title: string;
  body: string;
  bullets: readonly string[];
};

interface DemoBriefingModalProps {
  open: boolean;
  sections: readonly BriefingSection[];
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
  onClose: () => void;
}

export function DemoBriefingModal({
  open,
  sections,
  activeSectionId,
  onSelectSection,
  onClose,
}: DemoBriefingModalProps) {
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

  const activeSection =
    sections.find((section) => section.id === activeSectionId) ?? sections[0];

  return (
    <div
      className="fixed inset-0 z-[72] overflow-y-auto bg-slate-950/40 p-3 sm:p-4 lg:p-6 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="mx-auto my-2 flex min-h-[min(92vh,48rem)] w-full max-w-6xl overflow-hidden rounded-[28px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-[0_36px_80px_rgba(15,23,42,0.22)]">
        <aside className="hidden w-72 shrink-0 border-r border-[var(--color-border-soft)] bg-[linear-gradient(180deg,#0d0a62_0%,#08004d_100%)] px-5 py-6 text-white lg:flex lg:flex-col">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/55">
            Demo Guide
          </p>
          <h3 className="mt-4 font-headline text-[28px] font-bold leading-[1.08]">
            Ask the Data
            <br />
            Sales Briefing
          </h3>
          <p className="mt-4 text-sm leading-7 text-white/72">
            Use this guide to explain the data scope, business outcomes, and recommended demo storyline before the audience starts exploring.
          </p>

          <div className="mt-8 space-y-2">
            {sections.map((section, index) => {
              const active = section.id === activeSection.id;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => onSelectSection(section.id)}
                  className={`w-full rounded-[18px] border px-4 py-3 text-left transition ${
                    active
                      ? "border-white/14 bg-white/12 text-white"
                      : "border-white/8 bg-white/[0.04] text-white/72 hover:border-white/14 hover:bg-white/[0.08] hover:text-white"
                  }`}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
                    Section {index + 1}
                  </p>
                  <p className="mt-1 font-headline text-sm font-semibold">{section.label}</p>
                </button>
              );
            })}
          </div>

          <div className="mt-auto rounded-[18px] border border-white/10 bg-white/[0.05] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
              Recommended Opening
            </p>
            <p className="mt-2 text-sm leading-6 text-white/78">
              This demo shows how business teams can ask portfolio questions in natural language and receive governed answers, visual insights, and follow-up analysis in one controlled workflow.
            </p>
          </div>
        </aside>

        <div className="flex min-h-[min(92vh,48rem)] min-w-0 flex-1 flex-col">
          <div className="flex items-start justify-between border-b border-[var(--color-border-soft)] px-5 py-5 sm:px-7">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-subtle)]">
                Demo Briefing
              </p>
              <h3 className="mt-2 font-headline text-[28px] font-bold leading-[1.08] text-[var(--color-ink-strong)]">
                {activeSection.title}
              </h3>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-ink-muted)]">
                {activeSection.body}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-[var(--color-border-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--color-ink-muted)] transition hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)]"
            >
              Close
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-7 sm:py-6">
            <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
              <section className="rounded-[22px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-subtle)]">
                  What To Tell The Audience
                </p>
                <ul className="mt-4 space-y-3">
                  {activeSection.bullets.map((bullet) => (
                    <li
                      key={bullet}
                      className="rounded-[16px] border border-[var(--color-border-soft)] bg-white px-4 py-3 text-sm leading-7 text-[var(--color-ink-muted)]"
                    >
                      {bullet}
                    </li>
                  ))}
                </ul>
              </section>

              <section className="space-y-5">
                <div className="rounded-[22px] border border-[var(--color-border-soft)] bg-[linear-gradient(180deg,#ffffff_0%,#f8f9fd_100%)] p-5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-subtle)]">
                    Suggested Demo Flow
                  </p>
                  <ol className="mt-4 space-y-3 text-sm leading-7 text-[var(--color-ink-muted)]">
                    <li className="rounded-[16px] border border-[var(--color-border-soft)] bg-white px-4 py-3">
                      Start with one aggregate portfolio question to establish trust and business relevance.
                    </li>
                    <li className="rounded-[16px] border border-[var(--color-border-soft)] bg-white px-4 py-3">
                      Show one chart-based follow-up to demonstrate visual exploration and analytical continuity.
                    </li>
                    <li className="rounded-[16px] border border-[var(--color-border-soft)] bg-white px-4 py-3">
                      Demonstrate one blocked sensitive request to highlight governance and policy control.
                    </li>
                    <li className="rounded-[16px] border border-[var(--color-border-soft)] bg-white px-4 py-3">
                      Close with RAG Studio only if the customer asks for policy-aware or document-grounded responses.
                    </li>
                  </ol>
                </div>

                <div className="rounded-[22px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-[0_12px_24px_rgba(15,23,42,0.05)]">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-subtle)]">
                    Self-Service Prompt Ideas
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {[
                      "What is the total deposit balance right now?",
                      "Show the outstanding credit trend by month.",
                      "Which cities have the largest deposit balance?",
                      "How many customers joined in the last 6 months?",
                    ].map((prompt) => (
                      <span
                        key={prompt}
                        className="rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-muted)]"
                      >
                        {prompt}
                      </span>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            <div className="mt-5 flex flex-wrap gap-3 lg:hidden">
              {sections.map((section) => {
                const active = section.id === activeSection.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => onSelectSection(section.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      active
                        ? "border-[var(--color-action-primary)] bg-[var(--color-action-soft)] text-[var(--color-action-primary)]"
                        : "border-[var(--color-border-soft)] bg-white text-[var(--color-ink-muted)]"
                    }`}
                  >
                    {section.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-soft)] px-5 py-4 sm:px-7">
            <p className="text-xs text-[var(--color-ink-subtle)]">
              This guide is part of the app experience and does not depend on AI responses.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-pill)] bg-[var(--color-action-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-action-primary-hover)]"
            >
              Start Exploring
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
