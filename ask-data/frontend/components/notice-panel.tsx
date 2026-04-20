interface NoticePanelProps {
  title: string;
  message: string;
  tone?: "empty" | "error";
}

const toneClasses: Record<NonNullable<NoticePanelProps["tone"]>, string> = {
  empty: "border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

export function NoticePanel({ title, message, tone = "empty" }: NoticePanelProps) {
  return (
    <section className={`rounded-[var(--radius-panel)] border p-5 shadow-panel ${toneClasses[tone]}`}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-6 opacity-80">{message}</p>
    </section>
  );
}
