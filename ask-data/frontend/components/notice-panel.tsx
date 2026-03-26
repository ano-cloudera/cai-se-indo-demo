interface NoticePanelProps {
  title: string;
  message: string;
  tone?: "empty" | "error";
}

const toneClasses: Record<NonNullable<NoticePanelProps["tone"]>, string> = {
  empty: "border-slate-200 bg-white/75 text-slate-600",
  error: "border-rose-200 bg-rose-50 text-rose-700",
};

export function NoticePanel({
  title,
  message,
  tone = "empty",
}: NoticePanelProps) {
  return (
    <section className={`rounded-[28px] border p-6 shadow-panel ${toneClasses[tone]}`}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6">{message}</p>
    </section>
  );
}
