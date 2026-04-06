import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ShellNavItem = {
  key: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  onSelect?: () => void;
};

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
        "group mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-2xl border px-4 py-3.5 text-left transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8ec5ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#08004D]",
        "active:translate-y-px",
        active
          ? "border-[#7dcfff] bg-[linear-gradient(180deg,#6970ff_0%,#5c63f2_100%)] text-white shadow-[0_16px_28px_rgba(92,99,242,0.24)]"
          : "border-transparent bg-transparent text-[#8f94ff] hover:border-white/6 hover:bg-white/[0.055] hover:text-[#c5c7ff]",
        className,
      )}
      aria-current={active ? "page" : undefined}
      {...props}
    >
      <span
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-150",
          active
            ? "border-white/12 bg-white/12 text-white"
            : "border-white/6 bg-white/[0.04] text-[#9ea1ff] group-hover:border-white/10 group-hover:bg-white/[0.08] group-hover:text-[#d6d8ff]",
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 font-headline text-[15px] font-semibold tracking-[-0.01em]">
        {label}
      </span>
    </button>
  );
}

export function AppSidebar({
  brand,
  items,
  footer,
}: {
  brand: ReactNode;
  items: ShellNavItem[];
  footer?: ReactNode;
}) {
  return (
    <aside className="app-sidebar fixed left-0 top-0 z-50 flex h-full w-[var(--shell-sidebar-w)] flex-col overflow-hidden py-6 shadow-2xl">
      <div className="px-5">{brand}</div>
      <nav className="nav-group mt-10 flex-1">
        {items.map((item) => (
          <SidebarNavButton
            key={item.key}
            active={item.active}
            icon={item.icon}
            label={item.label}
            onClick={item.onSelect}
          />
        ))}
      </nav>
      {footer ? <div className="mt-auto px-2">{footer}</div> : null}
    </aside>
  );
}

export function AppTopHeader({
  left,
  right,
}: {
  left: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="app-topbar fixed left-[var(--shell-sidebar-w)] right-0 top-0 z-40 flex h-[var(--shell-header-h)] items-center justify-between border-b border-[var(--color-border-soft)] shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <div className="absolute inset-x-0 bottom-0 h-[2px] bg-[#5F67F6]" />
      <div className="relative flex w-full items-center justify-between px-8">
        <div className="topbar-meta min-w-0">{left}</div>
        {right ? <div className="ml-6 flex shrink-0 items-center gap-4">{right}</div> : null}
      </div>
    </header>
  );
}

export function AppShell({
  sidebar,
  header,
  children,
}: {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="app-shell text-[var(--color-ink-strong)]">
      {sidebar}
      {header}
      <main className="ml-[var(--shell-sidebar-w)] min-h-screen bg-[var(--color-page-bg)] pt-[var(--shell-header-h)]">
        {children}
      </main>
    </div>
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
