interface StarterCardProps {
  title: string;
  description: string;
  onClick: () => void;
}

export function StarterCard({
  title,
  description,
  onClick,
}: StarterCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-[28px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,252,247,0.92)_100%)] p-5 text-left shadow-[0_18px_36px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-black/[0.02] transition hover:-translate-y-0.5 hover:border-[#f59e0b]/30 hover:shadow-[0_24px_50px_rgba(15,23,42,0.1)]"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-[#fff4e5] text-lg text-[#c2410c]">
        ✦
      </div>
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </button>
  );
}
