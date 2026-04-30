"use client";

import type { LLMProviderOption } from "@/lib/api";

interface ModelSettingsPanelProps {
  loading: boolean;
  error: string;
  options: LLMProviderOption[];
  activeProvider: string;
  activeModelName: string;
  draftProvider: string;
  draftModelId: string;
  saving: boolean;
  onProviderChange: (provider: string) => void;
  onModelChange: (modelId: string) => void;
  onSave: () => void;
}

function providerLabel(provider: string): string {
  return provider === "bedrock" ? "Amazon Bedrock" : "Azure OpenAI";
}

export function ModelSettingsPanel({
  loading,
  error,
  options,
  activeProvider,
  activeModelName,
  draftProvider,
  draftModelId,
  saving,
  onProviderChange,
  onModelChange,
  onSave,
}: ModelSettingsPanelProps) {
  const providerOptions = Array.from(new Set(options.map((option) => option.provider)));
  const modelsForProvider = options.filter((option) => option.provider === draftProvider);

  return (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-[var(--color-border-soft)] bg-[linear-gradient(180deg,#ffffff_0%,#f6f8ff_100%)] p-6 shadow-panel">
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#4968cf]">
          Model Settings
        </p>
        <h3 className="mt-3 font-headline text-[34px] font-bold leading-[1.04] text-[var(--color-ink-strong)]">
          Select The Active AI Connection
        </h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--color-ink-muted)]">
          Choose the connection first, then pick the available model for that provider. The selected configuration is saved in this browser and applied to the app session.
        </p>

        {error ? (
          <div className="mt-5 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="mt-6 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-[20px] border border-[var(--color-border-soft)] bg-white p-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-subtle)]">
              Connection
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {providerOptions.map((provider) => {
                const selected = provider === draftProvider;
                return (
                  <button
                    key={provider}
                    type="button"
                    onClick={() => onProviderChange(provider)}
                    className={`rounded-[18px] border px-4 py-4 text-left transition ${
                      selected
                        ? "border-[#5c63f2] bg-[rgba(92,99,242,0.08)] shadow-[0_10px_24px_rgba(92,99,242,0.08)]"
                        : "border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] hover:border-[#7c83ff] hover:bg-[rgba(92,99,242,0.04)]"
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
                      {providerLabel(provider)}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-[var(--color-ink-subtle)]">
                      {provider === "bedrock"
                        ? "Use the configured Amazon Bedrock runtime."
                        : "Use the configured Azure OpenAI deployment."}
                    </p>
                  </button>
                );
              })}
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-subtle)]">
                Model
              </p>
              <label className="mt-3 block rounded-[18px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-4 py-3">
                <span className="sr-only">Model</span>
                <select
                  value={draftModelId}
                  onChange={(event) => onModelChange(event.target.value)}
                  disabled={loading || modelsForProvider.length === 0}
                  className="w-full bg-transparent text-sm font-semibold text-[var(--color-ink-strong)] outline-none"
                >
                  {modelsForProvider.map((option) => (
                    <option key={`${option.provider}-${option.model_id}`} value={option.model_id}>
                      {option.model_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <div className="text-xs text-[var(--color-ink-subtle)]">
                {loading ? "Loading configured providers…" : "The saved choice is applied to the active chat session."}
              </div>
              <button
                type="button"
                onClick={onSave}
                disabled={saving || loading || !draftProvider}
                className="rounded-[var(--radius-pill)] bg-[var(--color-action-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-action-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Model Settings"}
              </button>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-[20px] border border-[var(--color-border-soft)] bg-white p-5 shadow-panel">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-subtle)]">
                Active Runtime
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]">
                    Provider
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink-strong)]">
                    {providerLabel(activeProvider)}
                  </p>
                </div>
                <div className="rounded-[16px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-ink-subtle)]">
                    Model
                  </p>
                  <p className="mt-2 text-sm font-semibold text-[var(--color-ink-strong)]">
                    {activeModelName || "Default configured model"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[20px] border border-[var(--color-border-soft)] bg-[#0d0a62] p-5 text-white shadow-panel">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">
                Notes
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-white/80">
                <li>Azure OpenAI and Amazon Bedrock use the same governed chat and SQL workflow.</li>
                <li>The model list reflects the configured connection catalog available to this deployment.</li>
                <li>The saved choice is stored locally and reused as the preferred AI setting in this browser.</li>
              </ul>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
