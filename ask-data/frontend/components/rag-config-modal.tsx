"use client";

import type {
  RagKnowledgeBaseOption,
  RagModelOption,
  RagSessionConfig,
} from "@/lib/api";

interface RagConfigModalProps {
  open: boolean;
  saving: boolean;
  ragAvailable: boolean;
  ragConfigLocked: boolean;
  config: RagSessionConfig;
  chatModels: RagModelOption[];
  rerankModels: RagModelOption[];
  knowledgeBases: RagKnowledgeBaseOption[];
  onClose: () => void;
  onToggleEnabled: (enabled: boolean) => void;
  onConfigChange: (config: RagSessionConfig) => void;
  onSave: () => void;
}

export function RagConfigModal({
  open,
  saving,
  ragAvailable,
  ragConfigLocked,
  config,
  chatModels,
  rerankModels,
  knowledgeBases,
  onClose,
  onToggleEnabled,
  onConfigChange,
  onSave,
}: RagConfigModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 p-6 backdrop-blur-[2px]">
      <div className="w-full max-w-4xl rounded-[24px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-[0_30px_80px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between border-b border-[var(--color-border-soft)] px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-subtle)]">
              RAG Studio
            </p>
            <h3 className="mt-1 text-xl font-semibold text-[var(--color-ink-strong)]">
              Knowledge Base Configuration
            </h3>
            <p className="mt-2 text-sm text-[var(--color-ink-muted)]">
              Enable this only when the user needs answers grounded in document knowledge rather than deposit and credit tables.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[var(--color-border-strong)] px-3 py-1.5 text-sm font-semibold text-[var(--color-ink-muted)] transition hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)]"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-[18px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] p-4">
            <div>
              <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
                Enable RAG Studio for this chat session
              </p>
              <p className="mt-1 text-xs text-[var(--color-ink-subtle)]">
                Saved config is reused across all following requests in the current session.
              </p>
            </div>
            <label className="inline-flex items-center gap-3 text-sm font-medium text-[var(--color-ink-muted)]">
              <span>{config.enabled ? "Enabled" : "Disabled"}</span>
              <input
                type="checkbox"
                checked={config.enabled}
                disabled={!ragAvailable}
                onChange={(event) => onToggleEnabled(event.target.checked)}
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-[var(--color-ink-muted)]">
              <span className="font-medium">Session name</span>
              <input
                value={config.session_name}
                onChange={(event) =>
                  onConfigChange({ ...config, session_name: event.target.value })
                }
                className="rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-[var(--color-ink-muted)]">
              <span className="font-medium">Project ID</span>
              <input
                type="number"
                value={config.project_id ?? ""}
                onChange={(event) =>
                  onConfigChange({
                    ...config,
                    project_id: Number(event.target.value),
                  })
                }
                className="rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 outline-none"
              />
            </label>

            <label className="flex flex-col gap-2 text-sm text-[var(--color-ink-muted)] md:col-span-2">
              <span className="font-medium">Knowledge base</span>
              <select
                value={config.knowledge_base_id ?? ""}
                onChange={(event) => {
                  const selected = knowledgeBases.find(
                    (item) => item.id === Number(event.target.value),
                  );
                  onConfigChange({
                    ...config,
                    knowledge_base_id: Number(event.target.value),
                    knowledge_base_name: selected?.name ?? null,
                  });
                }}
                className="rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 outline-none"
              >
                <option value="">Select a knowledge base</option>
                {knowledgeBases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.id})
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-[var(--color-ink-muted)]">
              <span className="font-medium">Chat model</span>
              <select
                value={config.inference_model_id ?? ""}
                onChange={(event) => {
                  const selected = chatModels.find((item) => item.model_id === event.target.value);
                  onConfigChange({
                    ...config,
                    inference_model_id: event.target.value,
                    inference_model_name: selected?.name ?? null,
                  });
                }}
                className="rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 outline-none"
              >
                <option value="">Select a model</option>
                {chatModels.map((item) => (
                  <option key={item.model_id} value={item.model_id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-[var(--color-ink-muted)]">
              <span className="font-medium">Reranking model</span>
              <select
                value={config.rerank_model_id ?? ""}
                onChange={(event) => {
                  const selected = rerankModels.find((item) => item.model_id === event.target.value);
                  onConfigChange({
                    ...config,
                    rerank_model_id: event.target.value || null,
                    rerank_model_name: selected?.name ?? null,
                  });
                }}
                className="rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 outline-none"
              >
                <option value="">No reranking</option>
                {rerankModels.map((item) => (
                  <option key={item.model_id} value={item.model_id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-2 text-sm text-[var(--color-ink-muted)] md:col-span-2">
              <span className="font-medium">
                Maximum number of document chunks: {config.response_chunks}
              </span>
              <input
                type="range"
                min={1}
                max={20}
                step={1}
                value={config.response_chunks}
                onChange={(event) =>
                  onConfigChange({
                    ...config,
                    response_chunks: Number(event.target.value),
                  })
                }
              />
            </label>
          </div>

          <div className="rounded-[18px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--color-ink-strong)]">
              Advanced options
            </p>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                ["Enable Tool Calling", "enable_tool_calling"],
                ["Enable HyDE", "enable_hyde"],
                ["Enable Summary Filtering", "enable_summary_filter"],
                ["Disable Streaming", "disable_streaming"],
              ].map(([label, key]) => (
                <label key={key} className="flex items-center justify-between gap-4 rounded-[12px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-3 py-2.5 text-sm text-[var(--color-ink-muted)]">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    checked={Boolean(config.query_configuration[key as keyof typeof config.query_configuration])}
                    onChange={(event) =>
                      onConfigChange({
                        ...config,
                        query_configuration: {
                          ...config.query_configuration,
                          [key]: event.target.checked,
                        },
                      })
                    }
                  />
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[var(--color-border-soft)] px-6 py-4">
          <div className="text-xs text-[var(--color-ink-subtle)]">
            {ragConfigLocked ? "Saved and active for this session." : "Changes take effect after you save."}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] px-4 py-2 text-sm font-semibold text-[var(--color-ink-muted)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-[var(--radius-pill)] bg-[linear-gradient(135deg,#6970ff_0%,#5c63f2_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save configuration"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
