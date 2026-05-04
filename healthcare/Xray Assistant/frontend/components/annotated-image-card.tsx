import Image from "next/image";

import { PanelCard, PanelHeader } from "./ui/card";

interface AnnotatedImageCardProps {
  imageUrl: string | null;
  loading?: boolean;
}

export function AnnotatedImageCard({ imageUrl, loading = false }: AnnotatedImageCardProps) {
  return (
    <PanelCard className="p-6">
      <PanelHeader
        title="Annotated Output"
        subtitle="Optional overlay returned by the inference service."
      />
      <div className="mt-5 overflow-hidden rounded-[20px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]">
        {imageUrl ? (
          <div className="relative aspect-[4/5] w-full">
            <Image
              src={imageUrl}
              alt="Annotated X-ray"
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 40vw"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm leading-6 text-[var(--color-ink-subtle)]">
            {loading
              ? "Annotated output will appear here if the service returns an overlay image."
              : "No annotated output is available for this result yet."}
          </div>
        )}
      </div>
    </PanelCard>
  );
}
