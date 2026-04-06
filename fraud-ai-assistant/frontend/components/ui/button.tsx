import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-action-primary)] text-white shadow-[var(--shadow-accent)] hover:bg-[var(--color-action-primary-hover)] active:bg-[var(--color-action-primary-pressed)]",
  secondary:
    "bg-[var(--color-surface-strong)] text-[var(--color-ink-strong)] border border-[var(--color-border-soft)] hover:bg-[var(--color-surface-muted)] active:bg-[var(--color-surface-subtle)]",
  tertiary:
    "bg-transparent text-[var(--color-action-primary)] border border-transparent hover:bg-[var(--color-action-soft)] active:bg-[var(--color-surface-subtle)]",
  destructive:
    "bg-[var(--color-danger-strong)] text-white shadow-[0_14px_24px_rgba(186,26,26,0.18)] hover:bg-[#9f111d] active:bg-[#840d18]",
  ghost:
    "bg-white/8 text-white hover:bg-white/14 active:bg-white/18",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 rounded-xl px-3.5 text-[13px]",
  md: "h-10 rounded-[14px] px-4 text-[13px]",
  lg: "h-12 rounded-[16px] px-5 text-[14px]",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  leadingIcon,
  trailingIcon,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold tracking-[0.01em] transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-action-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
}
