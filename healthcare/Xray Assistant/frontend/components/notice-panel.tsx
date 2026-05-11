import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

interface NoticePanelProps {
  title: string;
  message: string;
  tone?: "empty" | "error" | "warning";
  badgeLabel?: string;
  suggestion?: string;
  compact?: boolean;
}

const toneClasses: Record<NonNullable<NoticePanelProps["tone"]>, string> = {
  empty: "border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] text-[var(--color-ink-muted)]",
  error: "border-rose-200 bg-rose-50 text-rose-700",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
};

const badgeClasses: Record<NonNullable<NoticePanelProps["tone"]>, string> = {
  empty: "bg-white/80 text-[var(--color-ink-subtle)] border-[var(--color-border-soft)]",
  error: "bg-white/60 text-rose-700 border-rose-200",
  warning: "bg-white/60 text-amber-800 border-amber-200",
};

function ToneIcon({ tone }: { tone: NonNullable<NoticePanelProps["tone"]> }) {
  if (tone === "error") {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
        <ErrorOutlineIcon sx={{ fontSize: 18 }} />
      </span>
    );
  }

  if (tone === "warning") {
    return (
      <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <WarningAmberIcon sx={{ fontSize: 18 }} />
      </span>
    );
  }

  return (
    <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 text-[var(--color-ink-subtle)]">
      <InfoOutlinedIcon sx={{ fontSize: 18 }} />
    </span>
  );
}

export function NoticePanel({
  title,
  message,
  tone = "empty",
  badgeLabel,
  suggestion,
  compact = false,
}: NoticePanelProps) {
  return (
    <section className={`rounded-[var(--radius-panel)] border shadow-panel ${compact ? "p-3 sm:p-4" : "p-5"} ${toneClasses[tone]}`}>
      <div className={`flex items-start ${compact ? "gap-2.5" : "gap-3"}`}>
        {compact ? null : <ToneIcon tone={tone} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`${compact ? "text-xs" : "text-sm"} font-semibold`}>{title}</h3>
            {badgeLabel ? (
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${badgeClasses[tone]}`}>
                {badgeLabel}
              </span>
            ) : null}
          </div>
          <p className={`${compact ? "mt-1 text-xs leading-5" : "mt-1.5 text-sm leading-6"} opacity-85`}>{message}</p>
          {suggestion ? (
            <p className={`${compact ? "mt-1.5 text-xs leading-5" : "mt-3 text-sm leading-6"} font-medium opacity-90`}>
              {suggestion}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
