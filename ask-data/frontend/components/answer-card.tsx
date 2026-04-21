import type { AnswerSource } from "@/lib/api";

interface AnswerCardProps {
  answer: string;
  sources?: AnswerSource[];
}

function formatScore(score: number | null | undefined): string | null {
  if (typeof score !== "number" || Number.isNaN(score)) return null;
  return score.toFixed(3);
}

export function AnswerCard({ answer, sources = [] }: AnswerCardProps) {
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

        {sources.length > 0 ? (
          <div className="mt-5 border-t border-[var(--color-border-soft)] pt-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-subtle)]">
              Sources
            </p>
            <div className="mt-3 grid gap-2">
              {sources.map((source, index) => (
                <div
                  key={`${source.document_id ?? "doc"}-${source.node_id ?? index}`}
                  className="rounded-[14px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-3 py-2.5"
                >
                  <p className="text-sm font-medium text-[var(--color-ink-strong)]">
                    {source.title}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[var(--color-ink-subtle)]">
                    {source.document_id ? <span>Document ID: {source.document_id}</span> : null}
                    {source.node_id ? <span>Node ID: {source.node_id}</span> : null}
                    {formatScore(source.score) ? <span>Score: {formatScore(source.score)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
