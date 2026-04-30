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

const sectionTheme: Record<
  string,
  {
    kicker: string;
    shell: string;
    chip: string;
    callout: string;
    softCard: string;
  }
> = {
  "use-case": {
    kicker: "text-sky-700",
    shell: "border-sky-200 bg-[linear-gradient(180deg,#f6fbff_0%,#eef7ff_100%)]",
    chip: "border-sky-200 bg-white text-sky-700",
    callout: "border-sky-100 bg-white",
    softCard: "border-sky-100 bg-sky-50/60",
  },
  "data-scope": {
    kicker: "text-emerald-700",
    shell: "border-emerald-200 bg-[linear-gradient(180deg,#f5fff9_0%,#edf9f2_100%)]",
    chip: "border-emerald-200 bg-white text-emerald-700",
    callout: "border-emerald-100 bg-white",
    softCard: "border-emerald-100 bg-emerald-50/60",
  },
  "business-value": {
    kicker: "text-amber-700",
    shell: "border-amber-200 bg-[linear-gradient(180deg,#fffaf2_0%,#fff4df_100%)]",
    chip: "border-amber-200 bg-white text-amber-700",
    callout: "border-amber-100 bg-white",
    softCard: "border-amber-100 bg-amber-50/60",
  },
  "how-to-demo": {
    kicker: "text-rose-700",
    shell: "border-rose-200 bg-[linear-gradient(180deg,#fff7f8_0%,#fff0f3_100%)]",
    chip: "border-rose-200 bg-white text-rose-700",
    callout: "border-rose-100 bg-white",
    softCard: "border-rose-100 bg-rose-50/60",
  },
};

const sectionSupportCopy: Record<
  string,
  {
    audienceTitle: string;
    audienceBody: string;
    flowTitle: string;
    flowSteps: readonly string[];
    promptTitle: string;
    prompts: readonly string[];
  }
> = {
  "use-case": {
    audienceTitle: "What The Customer Should Understand First",
    audienceBody:
      "Lead with the operating model, not the technology stack. The objective is to show that this assistant shortens the path from portfolio question to management-ready answer while staying inside controlled data boundaries.",
    flowTitle: "How To Present This Section",
    flowSteps: [
      "Open by describing a familiar business moment such as a weekly review, portfolio watchlist, or relationship planning meeting.",
      "Position the assistant as a way to answer the next question in the room immediately instead of escalating to a separate reporting cycle.",
      "Reinforce that the experience combines speed, explainability, and governance rather than asking the customer to trade one for another.",
    ],
    promptTitle: "Strong Opening Prompts",
    prompts: [
      "What is the total deposit balance right now?",
      "What is the total outstanding credit right now?",
      "How many customers do we currently manage in this portfolio?",
    ],
  },
  "data-scope": {
    audienceTitle: "What The Audience Needs To See In Scope",
    audienceBody:
      "Clarify the scope early so the customer knows this is grounded in real portfolio structures. The assistant is strongest when questions stay tied to customer, deposit, and credit relationships rather than open-ended general knowledge.",
    flowTitle: "How To Present This Section",
    flowSteps: [
      "Describe the three domains in business language before showing any query result.",
      "Explain that linked customer relationships allow the user to move from totals into segment, geography, or customer-level analysis without changing context.",
      "Set expectations that policy or document questions are handled through RAG Studio rather than the core structured data flow.",
    ],
    promptTitle: "Good Scope-Setting Prompts",
    prompts: [
      "Show the deposit balance split by city.",
      "Which customer segments hold the highest total deposit balance?",
      "Show outstanding credit trend by month.",
    ],
  },
  "business-value": {
    audienceTitle: "What Business Sponsors Usually Care About",
    audienceBody:
      "This section should sound commercial, not technical. Speak in terms of decision velocity, reduced analyst turnaround, better meeting quality, and safer self-service access to governed insight.",
    flowTitle: "How To Present This Section",
    flowSteps: [
      "Translate every feature back into a business improvement such as shorter turnaround time or stronger meeting readiness.",
      "Use the guardrails story to show that self-service can expand responsibly without opening direct access to protected customer data.",
      "Close by linking structured answers and charts to easier stakeholder communication across business, data, and risk teams.",
    ],
    promptTitle: "Prompts That Reinforce Value",
    prompts: [
      "Show the top cities by deposit balance.",
      "Compare total deposit and outstanding credit by segment.",
      "Show customer growth trend over the last 6 months.",
    ],
  },
  "how-to-demo": {
    audienceTitle: "How To Run A Reliable Demo Narrative",
    audienceBody:
      "A strong demo does not try to show everything at once. Start with a trusted answer, layer in one visual follow-up, then use one guardrail example to prove that the experience remains safe under pressure.",
    flowTitle: "Suggested Demo Sequence",
    flowSteps: [
      "Begin with one aggregate portfolio question that everyone in the room can immediately validate.",
      "Move to one trend or comparison so the customer sees continuity from answer to chart without resetting the conversation.",
      "Use one blocked sensitive request to demonstrate governance, then redirect the session to a safe aggregate alternative.",
      "Only open RAG Studio if the discussion naturally shifts to policy, SOP, or document-grounded responses.",
    ],
    promptTitle: "Recommended Demo Prompts",
    prompts: [
      "Show the outstanding credit trend by month.",
      "Which cities have the largest deposit balance?",
      "Show total customer growth over the last 6 months.",
      "Show the top 5 customers by total deposit balance.",
    ],
  },
};

export function DemoGuidePanel({
  sections,
  activeSectionId,
  onSelectSection,
}: DemoGuidePanelProps) {
  const activeSection = sections.find((section) => section.id === activeSectionId) ?? sections[0];
  const theme = sectionTheme[activeSection.id] ?? sectionTheme["use-case"];
  const support =
    sectionSupportCopy[activeSection.id] ?? sectionSupportCopy["use-case"];

  return (
    <div className="space-y-5">
      <section className={`rounded-[26px] border px-6 py-6 shadow-panel ${theme.shell}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.26em] ${theme.kicker}`}>
              Demo Guide
            </p>
            <h3 className="mt-3 font-headline text-[34px] font-bold leading-[1.04] text-[var(--color-ink-strong)]">
              Ask the Data Sales Briefing
            </h3>
            <p className="mt-4 text-[15px] leading-8 text-[var(--color-ink-muted)]">
              Use this guide to frame the solution before live exploration starts. It is designed to help sales teams, solution engineers, and customer stakeholders align on what the demo covers, why it matters, and how to tell the story in a business-relevant way.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${theme.chip}`}>
              Customer Demo Ready
            </span>
            <span className="rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-ink-muted)]">
              Guided Storyline
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-[20px] border border-white/70 bg-white/70 p-5 backdrop-blur-sm">
          <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.kicker}`}>
            Recommended Opening
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--color-ink-muted)]">
            This demo shows how portfolio and relationship teams can ask structured business questions in natural language, receive governed answers with visual support, and continue the discussion without breaking the flow of analysis.
          </p>
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--color-border-soft)] bg-white p-5 shadow-panel">
        <div className="flex flex-wrap gap-3">
          {sections.map((section, index) => {
            const isActive = section.id === activeSection.id;
            const chipTheme = sectionTheme[section.id] ?? sectionTheme["use-case"];
            return (
              <button
                key={section.id}
                type="button"
                onClick={() => onSelectSection(section.id)}
                className={`rounded-[18px] border px-4 py-3 text-left transition ${
                  isActive
                    ? `${chipTheme.chip} shadow-[0_12px_24px_rgba(15,23,42,0.08)]`
                    : "border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)] hover:border-[var(--color-action-primary)] hover:bg-[rgba(92,99,242,0.04)]"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] opacity-70">
                  Section {index + 1}
                </p>
                <p className="mt-1 font-headline text-sm font-semibold">{section.label}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className={`rounded-[26px] border px-6 py-6 shadow-panel ${theme.shell}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.kicker}`}>
              {activeSection.label}
            </p>
            <h3 className="mt-3 font-headline text-[34px] font-bold leading-[1.05] text-[var(--color-ink-strong)]">
              {activeSection.title}
            </h3>
            <p className="mt-4 text-[15px] leading-8 text-[var(--color-ink-muted)]">
              {activeSection.body}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-5">
            <div className={`rounded-[22px] border p-5 ${theme.callout}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.kicker}`}>
                {support.audienceTitle}
              </p>
              <p className="mt-3 text-sm leading-7 text-[var(--color-ink-muted)]">
                {support.audienceBody}
              </p>
            </div>

            <div className="rounded-[22px] border border-white/70 bg-white/72 p-5 backdrop-blur-sm">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.kicker}`}>
                What To Explain
              </p>
              <ul className="mt-4 space-y-3">
                {activeSection.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className={`rounded-[16px] border px-4 py-4 text-sm leading-7 text-[var(--color-ink-muted)] ${theme.callout}`}
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="space-y-5">
            <div className="rounded-[22px] border border-white/70 bg-white/72 p-5 backdrop-blur-sm">
              <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.kicker}`}>
                {support.flowTitle}
              </p>
              <div className="mt-4 space-y-3">
                {support.flowSteps.map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-[16px] border px-4 py-4 ${theme.callout}`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]">
                      Step {index + 1}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-[var(--color-ink-muted)]">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`rounded-[22px] border p-5 ${theme.softCard}`}>
              <p className={`text-[11px] font-semibold uppercase tracking-[0.24em] ${theme.kicker}`}>
                {support.promptTitle}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {support.prompts.map((prompt) => (
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
