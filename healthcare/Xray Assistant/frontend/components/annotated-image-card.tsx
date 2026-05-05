import Image from "next/image";
import { useState } from "react";

import { PanelCard, PanelHeader } from "./ui/card";

interface AnnotatedImageCardProps {
  imageUrl: string | null;
  fallbackUrl?: string | null;
  hasDetections?: boolean;
  loading?: boolean;
}

export function AnnotatedImageCard({
  imageUrl,
  fallbackUrl = null,
  hasDetections = false,
  loading = false,
}: AnnotatedImageCardProps) {
  const [activeView, setActiveView] = useState<"reviewed" | "original">("reviewed");
  const canShowOriginal = Boolean(fallbackUrl);
  const canShowReviewed = Boolean(imageUrl || (hasDetections && fallbackUrl));
  const displayUrl =
    activeView === "original" && canShowOriginal
      ? fallbackUrl
      : imageUrl || (hasDetections ? fallbackUrl : null);

  return (
    <PanelCard className="p-6">
      <PanelHeader
        title="Analysis Result Image"
        subtitle="Reviewed image output with annotation overlay when available."
        actions={
          canShowReviewed && canShowOriginal ? (
            <div className="inline-flex rounded-full border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] p-1">
              <button
                type="button"
                onClick={() => setActiveView("reviewed")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeView === "reviewed" ? "bg-white text-[var(--color-ink-strong)] shadow-sm" : "text-[var(--color-ink-subtle)]"}`}
              >
                Reviewed
              </button>
              <button
                type="button"
                onClick={() => setActiveView("original")}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${activeView === "original" ? "bg-white text-[var(--color-ink-strong)] shadow-sm" : "text-[var(--color-ink-subtle)]"}`}
              >
                Original
              </button>
            </div>
          ) : null
        }
      />
      <div className="mt-5 overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]">
        {displayUrl ? (
          <div className="relative aspect-[4/5] w-full">
            <Image
              src={displayUrl}
              alt="Analysis result image"
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 40vw"
              unoptimized
            />
            {!imageUrl && hasDetections ? (
              <div className="absolute left-4 top-4 rounded-full border border-[var(--color-soft-amber-border)] bg-[var(--color-soft-amber)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#7a5a1f]">
                Overlay unavailable
              </div>
            ) : null}
            {activeView === "reviewed" && imageUrl ? (
              <div className="absolute bottom-4 left-4 rounded-full border border-[var(--color-soft-blue-border)] bg-white/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-action-primary)]">
                Reviewed image
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm leading-6 text-[var(--color-ink-subtle)]">
            {loading
              ? "Analysis result image will appear here after review completes."
              : "No review image is available for this result yet."}
          </div>
        )}
      </div>
    </PanelCard>
  );
}
