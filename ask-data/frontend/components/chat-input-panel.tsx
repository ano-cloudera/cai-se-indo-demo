"use client";

import type {
  RagKnowledgeBaseOption,
  RagModelOption,
  RagSessionConfig,
} from "@/lib/api";

interface ChatInputPanelProps {
  question: string;
  loading: boolean;
  starterPrompts: string[];
  ragAvailable: boolean;
  ragPanelOpen: boolean;
  ragSaving: boolean;
  ragConfigLocked: boolean;
  ragConfig: RagSessionConfig;
  chatModels: RagModelOption[];
  rerankModels: RagModelOption[];
  knowledgeBases: RagKnowledgeBaseOption[];
  onQuestionChange: (value: string) => void;
  onStarterSelect: (value: string) => void;
  onSubmit: () => void;
  onToggleRag: (enabled: boolean) => void;
  onOpenRagPanel: () => void;
  onCloseRagPanel: () => void;
  onRagConfigChange: (config: RagSessionConfig) => void;
  onSaveRagConfig: () => void;
}

export function ChatInputPanel({
  question,
  loading,
  starterPrompts,
  ragAvailable,
  ragPanelOpen,
  ragSaving,
  ragConfigLocked,
  ragConfig,
  chatModels,
  rerankModels,
  knowledgeBases,
  onQuestionChange,
  onStarterSelect,
  onSubmit,
  onToggleRag,
  onOpenRagPanel,
  onCloseRagPanel,
  onRagConfigChange,
  onSaveRagConfig,
}: ChatInputPanelProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    if (!loading) onSubmit();
  }

  const selectedKnowledgeBase = knowledgeBases.find(
    (item) => item.id === ragConfig.knowledge_base_id,
  );

  return (
    <section
      className="rounded-[var(--radius-panel)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] shadow-panel"
      style={{ padding: "var(--space-4)" }}
    >
      <div
        className="rounded-[var(--radius-control)] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)]"
        style={{ padding: "var(--space-4)" }}
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-ink-subtle)]">
              Response Mode
            </p>
            <p className="mt-1 text-sm text-[var(--color-ink-muted)]">
              Default tetap data query. Aktifkan RAG Studio jika butuh knowledge base tambahan.
            </p>
          </div>
          <label className="inline-flex items-center gap-3 rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm font-medium text-[var(--color-ink-muted)]">
            <span>Use RAG Studio</span>
            <button
              type="button"
              disabled={!ragAvailable || loading}
              onClick={() => onToggleRag(!ragConfig.enabled)}
              className={`relative h-6 w-11 rounded-full transition ${
                ragConfig.enabled ? "bg-[#5c63f2]" : "bg-[#c7ccda]"
              } ${(!ragAvailable || loading) ? "cursor-not-allowed opacity-50" : ""}`}
              aria-pressed={ragConfig.enabled}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  ragConfig.enabled ? "left-[22px]" : "left-0.5"
                }`}
              />
            </button>
          </label>
        </div>

        {ragConfig.enabled ? (
          <div className="mb-4 rounded-[18px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[var(--color-ink-strong)]">
                  RAG Studio configuration
                </p>
                <p className="mt-1 text-xs leading-6 text-[var(--color-ink-subtle)]">
                  Once saved, this config is locked to the current chat session and all following RAG calls will reuse it.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={ragPanelOpen ? onCloseRagPanel : onOpenRagPanel}
                  className="rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)] transition hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)]"
                >
                  {ragPanelOpen ? "Hide config" : ragConfigLocked ? "Edit config" : "Configure"}
                </button>
                {ragConfigLocked ? (
                  <span className="rounded-[var(--radius-pill)] bg-[rgba(92,99,242,0.12)] px-3 py-1.5 text-xs font-semibold text-[#4953d3]">
                    Locked to this session
                  </span>
                ) : null}
              </div>
            </div>

            {selectedKnowledgeBase ? (
              <p className="mt-3 text-xs text-[var(--color-ink-subtle)]">
                Active KB: <span className="font-semibold text-[var(--color-ink-strong)]">{selectedKnowledgeBase.name}</span> ({selectedKnowledgeBase.id})
              </p>
            ) : null}

            {ragPanelOpen ? (
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm text-[var(--color-ink-muted)]">
                  <span className="font-medium">Session name</span>
                  <input
                    value={ragConfig.session_name}
                    onChange={(event) =>
                      onRagConfigChange({ ...ragConfig, session_name: event.target.value })
                    }
                    className="rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 outline-none"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-[var(--color-ink-muted)]">
                  <span className="font-medium">Project ID</span>
                  <input
                    type="number"
                    value={ragConfig.project_id ?? ""}
                    onChange={(event) =>
                      onRagConfigChange({
                        ...ragConfig,
                        project_id: Number(event.target.value),
                      })
                    }
                    className="rounded-[14px] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2.5 outline-none"
                  />
                </label>

                <label className="flex flex-col gap-2 text-sm text-[var(--color-ink-muted)] md:col-span-2">
                  <span className="font-medium">Knowledge base</span>
                  <select
                    value={ragConfig.knowledge_base_id ?? ""}
                    onChange={(event) => {
                      const selected = knowledgeBases.find(
                        (item) => item.id === Number(event.target.value),
                      );
                      onRagConfigChange({
                        ...ragConfig,
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
                    value={ragConfig.inference_model_id ?? ""}
                    onChange={(event) => {
                      const selected = chatModels.find((item) => item.model_id === event.target.value);
                      onRagConfigChange({
                        ...ragConfig,
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
                    value={ragConfig.rerank_model_id ?? ""}
                    onChange={(event) => {
                      const selected = rerankModels.find((item) => item.model_id === event.target.value);
                      onRagConfigChange({
                        ...ragConfig,
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
                    Maximum number of document chunks: {ragConfig.response_chunks}
                  </span>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    step={1}
                    value={ragConfig.response_chunks}
                    onChange={(event) =>
                      onRagConfigChange({
                        ...ragConfig,
                        response_chunks: Number(event.target.value),
                      })
                    }
                  />
                </label>

                <div className="rounded-[14px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] p-4 md:col-span-2">
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
                          checked={Boolean(ragConfig.query_configuration[key as keyof typeof ragConfig.query_configuration])}
                          onChange={(event) =>
                            onRagConfigChange({
                              ...ragConfig,
                              query_configuration: {
                                ...ragConfig.query_configuration,
                                [key]: event.target.checked,
                              },
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 md:col-span-2">
                  <button
                    type="button"
                    onClick={onSaveRagConfig}
                    disabled={ragSaving}
                    className="rounded-[var(--radius-pill)] bg-[linear-gradient(135deg,#6970ff_0%,#5c63f2_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {ragSaving ? "Saving..." : "Save RAG config"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <textarea
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={4}
          placeholder={
            ragConfig.enabled
              ? "Ask a question using the configured knowledge base."
              : "Ask a question about your data. e.g. What is the total deposit balance or outstanding credit?"
          }
          className="w-full resize-none bg-transparent px-1 py-1 text-sm leading-6 text-[var(--color-ink-strong)] outline-none placeholder:text-[var(--color-ink-subtle)]"
        />

        <div
          className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-soft)] pt-3"
        >
          <div className="flex flex-wrap gap-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={loading}
                onClick={() => onStarterSelect(prompt)}
                className="rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] transition hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {prompt}
              </button>
            ))}
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={onSubmit}
            className="inline-flex items-center gap-2 rounded-[var(--radius-pill)] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "linear-gradient(135deg, #6970ff 0%, #5c63f2 100%)" }}
          >
            {loading ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Analyzing…
              </>
            ) : (
              <>
                Ask
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M1 7h12M7 1l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}
