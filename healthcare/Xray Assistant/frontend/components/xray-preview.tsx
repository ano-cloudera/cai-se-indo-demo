import Image from "next/image";

interface XrayPreviewProps {
  previewUrl: string | null;
  title?: string;
}

export function XrayPreview({ previewUrl, title = "Uploaded X-ray Preview" }: XrayPreviewProps) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="meta-kicker">Image Preview</p>
          <h3 className="mt-1 font-headline text-xl font-bold tracking-[-0.02em] text-[var(--color-ink-strong)]">
            {title}
          </h3>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[22px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]">
        {previewUrl ? (
          <div className="relative aspect-[4/5] w-full">
            <Image
              src={previewUrl}
              alt={title}
              fill
              className="object-contain"
              sizes="(max-width: 1024px) 100vw, 50vw"
              unoptimized
            />
          </div>
        ) : (
          <div className="flex aspect-[4/5] items-center justify-center px-6 text-center text-sm leading-6 text-[var(--color-ink-subtle)]">
            Upload a chest X-ray image to preview it here before analysis.
          </div>
        )}
      </div>
    </div>
  );
}
