interface AnswerCardProps {
  answer: string;
  timestampLabel?: string;
}

export function AnswerCard({
  answer,
  timestampLabel,
}: AnswerCardProps) {
  return (
    <section className="rounded-[30px] border border-[#ffd9b4] bg-[linear-gradient(180deg,rgba(255,249,241,0.96)_0%,rgba(255,255,255,0.96)_44%,rgba(255,245,228,0.94)_100%)] p-6 shadow-[0_22px_46px_rgba(245,158,11,0.08),0_10px_22px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.92)] ring-1 ring-[#fff2e1]/80">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="inline-flex rounded-full bg-[#073b3a] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
          BNI Data Analyst Assistant
        </span>
        {timestampLabel ? (
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            {timestampLabel}
          </span>
        ) : null}
      </div>

      <div className="rounded-[24px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,252,248,0.92)_100%)] px-5 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)]">
        <p className="whitespace-pre-line text-[15px] leading-8 text-slate-800">
          {answer}
        </p>
      </div>
    </section>
  );
}
