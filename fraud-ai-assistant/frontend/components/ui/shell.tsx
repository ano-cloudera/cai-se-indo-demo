import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export function SidebarNavButton({
  active,
  icon,
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "mx-2 flex w-[calc(100%-1rem)] items-center gap-3.5 rounded-[18px] border px-4 py-3.5 text-left transition-all duration-150",
        active
          ? "border-[#89d9ff] bg-[var(--color-action-primary)] text-white shadow-[var(--shadow-accent)]"
          : "border-transparent bg-transparent text-[#7e83ff] hover:bg-white/8 hover:text-[#aeb2ff]",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl",
          active ? "bg-white/12 text-white" : "bg-white/5 text-[#8f91ff]",
        )}
      >
        {icon}
      </span>
      <span className="font-headline text-base font-medium tracking-[-0.01em]">{label}</span>
    </button>
  );
}

export function PageCanvas({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("page-canvas", className)} {...props}>
      {children}
    </div>
  );
}

export function PageHeaderBlock({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("page-header-block", className)} {...props}>
      {children}
    </div>
  );
}

export function PageSection({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <section className={cn("page-section", className)} {...props}>
      {children}
    </section>
  );
}

export function FilterBar({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("filter-bar", className)} {...props}>
      {children}
    </div>
  );
}

export function FilterGroup({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("filter-group", className)} {...props}>
      {children}
    </div>
  );
}

export function MetricGrid({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("metric-grid", className)} {...props}>
      {children}
    </div>
  );
}

export function StickyRail({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("sticky-rail", className)} {...props}>
      {children}
    </div>
  );
}
