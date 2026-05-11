import UploadFileIcon from "@mui/icons-material/UploadFile";

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
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--color-border-soft)] bg-white shadow-[var(--shadow-card)]">
      <div className="p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
          {/* Left — description */}
          <div className="min-w-0 flex-1">
            <p className="meta-kicker">Chest X-ray Upload</p>
            <h3 className="mt-1.5 font-headline text-[1.35rem] font-bold leading-tight tracking-[-0.025em] text-[var(--color-ink-strong)]">
              Select a radiograph and start the review.
            </h3>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--color-ink-muted)]">
              Upload a chest X-ray image, confirm the preview, then run analysis to get a structured clinical summary.
            </p>
          </div>

          {/* Right — unified control group */}
          <div className="w-full shrink-0 rounded-[18px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] p-3 lg:w-auto lg:min-w-[18rem]">
            {/* Language row */}
            <div className="flex items-center justify-between gap-3 rounded-[12px] bg-white px-3.5 py-2.5 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--color-ink-subtle)]">Language</span>
              <select
                value={responseLanguage}
                onChange={(event) => onLanguageChange(event.target.value as ResponseLanguage)}
                className="border-0 bg-transparent text-sm font-semibold text-[var(--color-ink-strong)] outline-none"
              >
                <option value="en">English</option>
                <option value="id">Bahasa Indonesia</option>
              </select>
            </div>

            {/* Divider */}
            <div className="my-2 h-px bg-[var(--color-border-soft)]" />

            {/* File picker */}
            <label className="flex cursor-pointer items-center gap-2.5 rounded-[12px] bg-white px-3.5 py-2.5 shadow-sm transition hover:border-[var(--color-action-primary)]">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                className="hidden"
                onChange={(event) => onFileSelect(event.target.files?.[0] ?? null)}
              />
              <UploadFileIcon sx={{ fontSize: 16, color: "var(--color-action-primary)", flexShrink: 0 }} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-ink-strong)]">Select Radiograph</p>
                <p className="truncate text-xs text-[var(--color-ink-subtle)]">
                  {selectedFileName || "PNG or JPEG — no file chosen"}
                </p>
              </div>
            </label>

            {/* Divider */}
            <div className="my-2 h-px bg-[var(--color-border-soft)]" />

            {/* Submit button */}
            <button
              type="button"
              onClick={onSubmit}
              disabled={!selectedFileName || loading}
              className="w-full rounded-[12px] bg-[linear-gradient(135deg,#FF6B00_0%,#E54E00_100%)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_16px_rgba(255,107,0,0.25)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Running Detection…" : "Analyze Image"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
