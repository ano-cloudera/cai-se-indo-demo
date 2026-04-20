interface StarterCardProps {
  title: string;
  description: string;
  onClick: () => void;
}

export function StarterCard({ title, description, onClick }: StarterCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[var(--radius-panel)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 text-left shadow-panel transition hover:-translate-y-0.5 hover:border-[var(--color-action-primary)] hover:shadow-[0_22px_48px_rgba(92,99,242,0.1)]"
    >
      <div
        className="mb-4 flex h-9 w-9 items-center justify-center rounded-[10px] text-white"
        style={{ background: "linear-gradient(135deg, #6970ff 0%, #5c63f2 100%)" }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
          <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="font-headline text-sm font-semibold text-[var(--color-ink-strong)]">{title}</h3>
      <p className="mt-1.5 text-xs leading-5 text-[var(--color-ink-subtle)]">{description}</p>
    </button>
  );
}
