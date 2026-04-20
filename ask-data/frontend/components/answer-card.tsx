interface AnswerCardProps {
  answer: string;
}

export function AnswerCard({ answer }: AnswerCardProps) {
  return (
    <section className="max-w-[48rem] rounded-[var(--radius-panel)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-panel">
      <div className="flex items-center gap-2 border-b border-[var(--color-border-soft)] px-5 py-3">
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full text-white"
          style={{ background: "linear-gradient(135deg, #6970ff 0%, #5c63f2 100%)" }}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
            <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]">
          Analyst Response
        </span>
      </div>
      <div className="px-5 py-4">
        <p className="whitespace-pre-line text-[15px] leading-7 text-[var(--color-ink-strong)]">
          {answer}
        </p>
      </div>
    </section>
  );
}
