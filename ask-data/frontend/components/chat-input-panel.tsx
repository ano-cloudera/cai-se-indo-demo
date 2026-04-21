"use client";

interface ChatInputPanelProps {
  question: string;
  loading: boolean;
  starterPrompts: string[];
  onQuestionChange: (value: string) => void;
  onStarterSelect: (value: string) => void;
  onSubmit: () => void;
}

export function ChatInputPanel({
  question,
  loading,
  starterPrompts,
  onQuestionChange,
  onStarterSelect,
  onSubmit,
}: ChatInputPanelProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (!loading) onSubmit();
  }

  return (
    <section
      className="rounded-[var(--radius-panel)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-panel"
      style={{ padding: "var(--space-4)" }}
    >
      <div
        className="rounded-[var(--radius-control)] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]"
        style={{ padding: "var(--space-4)" }}
      >
        <textarea
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          placeholder="Ask a question about deposits, credits, customers, or related portfolio insights."
          className="w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 text-[var(--color-ink-strong)] outline-none placeholder:text-[var(--color-ink-subtle)]"
        />

        <div
          className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-soft)] pt-3"
        >
          <div className="flex flex-wrap gap-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={loading}
                onClick={() => onStarterSelect(prompt)}
                className="rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] transition hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onSubmit}
            className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #6970ff 0%, #5c63f2 100%)" }}
          >
            {loading ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Analyzing…
              </>
            ) : (
              <>
                Ask
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
