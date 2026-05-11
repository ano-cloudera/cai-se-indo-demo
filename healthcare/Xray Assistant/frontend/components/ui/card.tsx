import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "../../lib/cn";

export function PanelCard({
  className,
  children,
  tone = "default",
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  tone?: "default" | "indigo" | "dark";
}) {
  const toneClass =
    tone === "indigo"
      ? "bg-[linear-gradient(180deg,#7174fa_0%,#5c63f2_100%)] text-white shadow-[0_20px_40px_rgba(92,99,242,0.22)]"
      : tone === "dark"
        ? "bg-[linear-gradient(180deg,#110066_0%,#08004d_100%)] text-white shadow-[0_20px_40px_rgba(8,0,77,0.28)]"
        : "border border-[var(--color-border-soft)] bg-[var(--color-surface)] text-[var(--color-ink-strong)] shadow-[var(--shadow-card)]";

  return (
    <div
      className={cn("rounded-[var(--radius-panel)]", toneClass, className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function PanelHeader({
  title,
  subtitle,
  icon,
  actions,
  inverted = false,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  inverted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {icon ? (
            <span
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-2xl",
                inverted
                  ? "bg-white/10 text-white/80"
                  : "bg-[var(--color-action-soft)] text-[var(--color-action-primary)]",
              )}
            >
              {icon}
            </span>
          ) : null}
          <div className="min-w-0">
            <h3
              className={cn(
                "font-headline text-[var(--font-size-section-title)] font-[var(--font-weight-section-title)] leading-[var(--line-height-heading)] tracking-[-0.025em]",
                inverted ? "text-white" : "text-[var(--color-ink-strong)]",
              )}
            >
              {title}
            </h3>
            {subtitle ? (
              <p
                className={cn(
                  "section-subtitle",
                  inverted ? "text-white/60" : "text-[var(--color-ink-subtle)]",
                )}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  toneClassName,
}: {
  label: string;
  value: string;
  detail?: string;
  toneClassName?: string;
}) {
  return (
    <PanelCard className={cn("stat-card relative overflow-hidden px-4 py-3.5", toneClassName)}>
      <div className="flex flex-col gap-1.5">
        <span className="stat-card-label">{label}</span>
        <h3 className="metric-value text-[var(--color-ink-strong)] capitalize leading-none">
          {value}
        </h3>
      </div>
    </PanelCard>
  );
}
