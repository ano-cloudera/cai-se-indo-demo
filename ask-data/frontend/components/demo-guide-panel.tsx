"use client";

type BriefingSection = {
  id: string;
  label: string;
  title: string;
  body: string;
  bullets: readonly string[];
};

interface DemoGuidePanelProps {
  sections: readonly BriefingSection[];
  activeSectionId: string;
  onSelectSection: (sectionId: string) => void;
}

const sectionTheme: Record<string, { kicker: string; shell: string; chip: string; callout: string }> = {
  "use-case": {
    kicker: "text-sky-700",
    shell: "border-sky-200 bg-[linear-gradient(180deg,#f4fbff_0%,#eef7ff_100%)]",
    chip: "border-sky-200 bg-white text-sky-700",
    callout: "border-sky-100 bg-white",
  },
  "data-scope": {
    kicker: "text-emerald-700",
    shell: "border-emerald-200 bg-[linear-gradient(180deg,#f3fff8_0%,#ebfbf3_100%)]",
    chip: "border-emerald-200 bg-white text-emerald-700",
    callout: "border-emerald-100 bg-white",
  },
  "business-value": {
    kicker: "text-amber-700",
    shell: "border-amber-200 bg-[linear-gradient(180deg,#fffaf0_0%,#fff5df_100%)]",
    chip: "border-amber-200 bg-white text-amber-700",
    callout: "border-amber-100 bg-white",
  },
  "how-to-demo": {
    kicker: "text-rose-700",
    shell: "border-rose-200 bg-[linear-gradient(180deg,#fff6f7_0%,#fff0f3_100%)]",
    chip: "border-rose-200 bg-white text-rose-700",
    callout: "border-rose-100 bg-white",
  },
};

export function DemoGuidePanel({
  sections,
  activeSectionId,
  onSelectSection,
}: DemoGuidePanelProps) {
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const theme = sectionTheme[activeSection.id] ?? sectionTheme["use-case"];

  return (
    <div className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <aside className="rounded-[22px] border border-[var(--color-border-soft)] bg-[linear-gradient(180deg,#0d0a62_0%,#08004d_100%)] p-5 text-white shadow-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/55">
          Demo Guide
        </p>
        <h3 className="mt-4 font-headline text-[30px] font-bold leading-[1.04]">
          Ask the Data
          <br />
          Sales Briefing
        </h3>
        <p className="mt-4 text-sm leading-7 text-white/75">
          Use this guide to walk a customer through the use case, available data, business impact, and recommended story flow before live exploration begins.
        </p>

        <div className="mt-7 space-y-3">
          {sections.map((section, index) => {
            const active = section.id === activeSection.id;
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelectSection(section.id)}
                className={`w-full rounded-[18px] border px-4 py-3 text-left transition ${
                  active
                    ? "border-white/18 bg-white/14 text-white shadow-[0_12px_24px_rgba(12,8,78,0.28)]"
                    : "border-white/8 bg-white/[0.04] text-white/74 hover:border-white/16 hover:bg-white/[0.08] hover:text-white"
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

        <div className="mt-8 rounded-[18px] border border-white/10 bg-white/[0.05] p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
            Recommended Opening
          </p>
          <p className="mt-2 text-sm leading-6 text-white/78">
            This demo shows how business teams can ask portfolio questions in natural language and receive governed answers, visual insight, and follow-up guidance in one workflow.
          </p>
        </div>
      </aside>

      <section className={`rounded-[24px] border p-6 shadow-panel ${theme.shell}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.kicker}`}>
              {activeSection.label}
            </p>
            <h3 className="mt-3 font-headline text-[34px] font-bold leading-[1.04] text-[var(--color-ink-strong)]">
              {activeSection.title}
            </h3>
            <p className="mt-3 text-sm leading-7 text-[var(--color-ink-muted)]">
              {activeSection.body}
            </p>
          </div>
          <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${theme.chip}`}>
            Customer Demo Ready
          </span>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[20px] border border-white/70 bg-white/55 p-5 backdrop-blur-sm">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.kicker}`}>
              What To Explain
            </p>
            <ul className="mt-4 space-y-3">
              {activeSection.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className={`rounded-[16px] border px-4 py-3 text-sm leading-7 text-[var(--color-ink-muted)] ${theme.callout}`}
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-4">
            <div className="rounded-[20px] border border-white/70 bg-white/70 p-5 backdrop-blur-sm">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.kicker}`}>
                Suggested Flow
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "Start with one aggregate portfolio question to establish trust and relevance.",
                  "Show one trend or comparison so the customer sees visual exploration in motion.",
                  "Use one blocked sensitive request to show governance and policy control.",
                  "Open RAG Studio only when the customer asks for policy-aware or document-grounded answers.",
                ].map((item) => (
                  <div
                    key={item}
                    className={`rounded-[16px] border px-4 py-3 text-sm leading-7 text-[var(--color-ink-muted)] ${theme.callout}`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[20px] border border-white/70 bg-white/70 p-5 backdrop-blur-sm">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.kicker}`}>
                Prompt Ideas
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
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium ${theme.chip}`}
                  >
                    {prompt}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
