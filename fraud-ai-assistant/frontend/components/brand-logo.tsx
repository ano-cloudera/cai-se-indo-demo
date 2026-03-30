import Image from "next/image";

interface BrandLogoProps {
  compact?: boolean;
}

export function BrandLogo({ compact = false }: BrandLogoProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-[0_16px_30px_rgba(249,115,22,0.16)]">
        <Image
          src="/logo.png"
          alt="Fraud AI Assistant logo"
          fill
          className="object-contain p-2"
          sizes="72px"
          priority
        />
      </div>
      {!compact ? (
        <div className="min-w-0 pt-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#b45309]">
            Fraud Intelligence
          </p>
          <h1 className="mt-1.5 text-[1.22rem] font-semibold leading-[1.02] text-slate-950">
            Fraud AI Assistant
          </h1>
        </div>
      ) : (
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-none text-slate-950">
            Fraud AI
          </p>
        </div>
      )}
    </div>
  );
}
