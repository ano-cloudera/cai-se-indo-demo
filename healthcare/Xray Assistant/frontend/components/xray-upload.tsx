import type { ResponseLanguage } from "../lib/api";

interface XrayUploadProps {
  selectedFileName: string;
  loading: boolean;
  responseLanguage: ResponseLanguage;
  onLanguageChange: (language: ResponseLanguage) => void;
  onFileSelect: (file: File | null) => void;
  onSubmit: () => void;
}

export function XrayUpload({
  selectedFileName,
  loading,
  responseLanguage,
  onLanguageChange,
  onFileSelect,
  onSubmit,
}: XrayUploadProps) {
  return (
    <div className="rounded-[var(--radius-panel)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="meta-kicker">Chest X-ray Upload</p>
          <h3 className="mt-2 font-headline text-2xl font-bold tracking-[-0.02em] text-[var(--color-ink-strong)]">
            Select a radiograph and start the review.
          </h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-ink-muted)]">
            Upload a chest X-ray, preview it immediately, then run analysis to generate a structured clinical summary.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[19rem]">
          <label className="flex items-center justify-between rounded-[18px] border border-[var(--color-border-soft)] bg-white px-4 py-3 text-sm font-medium text-[var(--color-ink-muted)] shadow-sm">
            <span>Response Language</span>
            <select
              value={responseLanguage}
              onChange={(event) => onLanguageChange(event.target.value as ResponseLanguage)}
              className="border-0 bg-transparent text-sm font-semibold text-[var(--color-ink-strong)] outline-none"
            >
              <option value="en">English</option>
              <option value="id">Bahasa Indonesia</option>
            </select>
          </label>
          <label className="flex cursor-pointer items-center justify-center rounded-[18px] border border-[var(--color-border-soft)] bg-white px-4 py-3 text-sm font-semibold text-[var(--color-ink-strong)] shadow-sm transition hover:border-[var(--color-action-primary)]">
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              className="hidden"
              onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
            />
            Choose X-ray Image
          </label>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!selectedFileName || loading}
            className="rounded-[18px] bg-[linear-gradient(135deg,#6970ff_0%,#5c63f2_100%)] px-4 py-3 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Running Detection..." : "Analyze Image"}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-[var(--color-ink-subtle)]">
        <span className="inline-flex rounded-full border border-[var(--color-border-soft)] bg-white px-3 py-1.5">
          {selectedFileName || "No image selected yet"}
        </span>
        <span className="inline-flex rounded-full border border-[var(--color-border-soft)] bg-white px-3 py-1.5">
          PNG or JPG
        </span>
      </div>
    </div>
  );
}
