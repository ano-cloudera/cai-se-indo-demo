"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { AnswerCard } from "@/components/answer-card";
import { BrandLogo } from "@/components/brand-logo";
import { ChatInputPanel } from "@/components/chat-input-panel";
import { NoticePanel } from "@/components/notice-panel";
import { RagConfigModal } from "@/components/rag-config-modal";
import { ResultChartCard } from "@/components/result-chart-card";
import { StarterCard } from "@/components/starter-card";
import { StatusBadge } from "@/components/status-badge";
import { UserMessageCard } from "@/components/user-message-card";
import {
  AppShell,
  AppSidebar,
  AppTopHeader,
  PageCanvas,
} from "@/components/ui/shell";
import {
  apiClient,
  type AnswerSource,
  type ChatResponsePayload,
  type HealthResponse,
  type RagOptionsResponse,
  type RagSessionConfig,
  type VisualizationSpec,
} from "@/lib/api";
import { createNewSessionId, getOrCreateSessionId } from "@/lib/session";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AnswerSource[];
  metadata?: Record<string, unknown>;
  visualization?: VisualizationSpec | null;
}

interface ChatState {
  sessionId: string;
  question: string;
  messages: ChatMessage[];
  loading: boolean;
  error: string;
}

interface HealthState {
  loading: boolean;
  app: HealthResponse | null;
  db: HealthResponse | null;
  error: string;
}

const defaultRagConfig = (sessionId: string): RagSessionConfig => ({
  session_id: sessionId,
  enabled: false,
  session_name: "ask-data-rag-session",
  project_id: 1,
  knowledge_base_id: 291,
  knowledge_base_name: null,
  rag_session_id: null,
  inference_model_id: "",
  inference_model_name: null,
  rerank_model_id: null,
  rerank_model_name: null,
  response_chunks: 10,
  query_configuration: {
    enable_hyde: false,
    enable_summary_filter: true,
    enable_tool_calling: false,
    disable_streaming: false,
    selected_tools: [],
  },
});

const starterPrompts = [
  {
    title: "Total deposit balance",
    description: "View the current total deposit balance for a portfolio overview.",
    prompt: "What is the total deposit balance right now?",
  },
  {
    title: "Outstanding credit",
    description: "Summarize total outstanding credit to see current financing exposure.",
    prompt: "What is the total outstanding credit right now?",
  },
  {
    title: "Top debtors",
    description: "Find customers with the highest outstanding credit in current data.",
    prompt: "Who are the customers with the highest outstanding credit?",
  },
];

const fallbackRagOptions: RagOptionsResponse = {
  enabled: true,
  model_source: "fallback",
  chat_models: [
    {
      model_id: "meta.llama3-8b-instruct-v1:0",
      name: "Llama 3 8B Instruct",
      available: true,
      replica_count: 1,
      tool_calling_supported: false,
    },
  ],
  rerank_models: [],
  knowledge_bases: [
    {
      id: 291,
      name: "BPJS-Claim-Knowledge",
      description: "Fallback knowledge base option loaded locally while RAG options are unavailable.",
      document_count: 0,
      embedding_model: null,
      summarization_model: null,
      metadata: {
        source: "fallback",
      },
    },
  ],
};

function withFallbackRagOptions(options: RagOptionsResponse): RagOptionsResponse {
  return {
    enabled: options.enabled,
    model_source: options.model_source ?? fallbackRagOptions.model_source,
    chat_models:
      options.chat_models.length > 0 ? options.chat_models : fallbackRagOptions.chat_models,
    rerank_models:
      options.rerank_models.length > 0 ? options.rerank_models : fallbackRagOptions.rerank_models,
    knowledge_bases:
      options.knowledge_bases.length > 0
        ? options.knowledge_bases
        : fallbackRagOptions.knowledge_bases,
  };
}

function getGuardrailsNotice(metadata: Record<string, unknown> | undefined) {
  const action = typeof metadata?.guardrails_action === "string" ? metadata.guardrails_action : null;
  if (!action) return null;

  if (action === "block") {
    return {
      title: "Sensitive Data Request Blocked",
      message: "This request was restricted because it asked for personally identifiable or protected customer information.",
      badgeLabel: "Guardrails",
      suggestion: "Try asking for aggregate insights instead, such as customer counts by city, average balance by segment, or total outstanding credit by region.",
      tone: "warning" as const,
    };
  }

  if (action === "redact") {
    return {
      title: "Response Sanitized For Privacy",
      message: "The assistant returned the answer, but sensitive values were masked before display.",
      badgeLabel: "PII Protected",
      suggestion: "You can still continue with aggregate or trend questions that do not require direct customer identifiers.",
      tone: "warning" as const,
    };
  }

  return null;
}

function getGuardrailsStatusBadge(health: HealthState) {
  const guardrails = health.app?.guardrails;
  if (!guardrails?.enabled || !guardrails.mode) return null;

  if (guardrails.mode === "remote") {
    return {
      label: "Guardrails Remote",
      tone: "success" as const,
    };
  }

  if (guardrails.mode === "local-only") {
    return {
      label: "Guardrails Local",
      tone: "warning" as const,
    };
  }

  if (guardrails.mode === "misconfigured") {
    return {
      label: "Guardrails Needs Setup",
      tone: "danger" as const,
    };
  }

  return {
    label: "Guardrails Off",
    tone: "neutral" as const,
  };
}

const initialChatState: ChatState = {
  sessionId: "",
  question: "",
  messages: [],
  loading: false,
  error: "",
};

const navItems = [
  {
    key: "assistant",
    label: "AI Assistant",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M9 2a7 7 0 1 1 0 14A7 7 0 0 1 9 2Z" stroke="currentColor" strokeWidth="1.6" />
        <path d="M6.5 10s.5 1.5 2.5 1.5 2.5-1.5 2.5-1.5M7 7h.01M11 7h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function HomePage() {
  const [state, setState] = useState<ChatState>(initialChatState);
  const [health, setHealth] = useState<HealthState>({
    loading: true,
    app: null,
    db: null,
    error: "",
  });
  const [ragOptions, setRagOptions] = useState<RagOptionsResponse | null>(null);
  const [ragOptionsLoading, setRagOptionsLoading] = useState(false);
  const [ragConfig, setRagConfig] = useState<RagSessionConfig>(defaultRagConfig(""));
  const [ragPanelOpen, setRagPanelOpen] = useState(false);
  const [ragSaving, setRagSaving] = useState(false);
  const [ragConfigDirty, setRagConfigDirty] = useState(false);
  const [openedAt] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      ", " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  });

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    setState((cur) => ({ ...cur, sessionId }));
    setRagConfig(defaultRagConfig(sessionId));
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, []);

  useEffect(() => {
    void ensureRagOptionsLoaded();
  }, []);

  useEffect(() => {
    if (!state.sessionId) return;
    void loadSavedRagConfig(state.sessionId);
  }, [state.sessionId]);

  async function refreshHealth() {
    setHealth((cur) => ({ ...cur, loading: true, error: "" }));
    try {
      const [appHealth, dbHealth] = await Promise.all([
        apiClient.health(),
        apiClient.healthDb(),
      ]);
      setHealth({ loading: false, app: appHealth, db: dbHealth, error: "" });
    } catch (error) {
      setHealth({
        loading: false,
        app: null,
        db: null,
        error: error instanceof Error ? error.message : "Unable to reach the backend.",
      });
    }
  }

  async function loadRagOptions() {
    setRagOptionsLoading(true);
    try {
      const options = withFallbackRagOptions(await apiClient.ragOptions());
      setRagOptions(options);

      const preferredModel =
        options.chat_models.find((model) => model.name === "Llama 3 8B Instruct") ??
        options.chat_models[0];
      const preferredKb =
        options.knowledge_bases.find((item) => item.id === 291) ??
        options.knowledge_bases[0];

      setRagConfig((cur) => ({
        ...cur,
        knowledge_base_id: cur.knowledge_base_id ?? preferredKb?.id ?? null,
        knowledge_base_name: cur.knowledge_base_name ?? preferredKb?.name ?? null,
        inference_model_id: cur.inference_model_id || preferredModel?.model_id || "",
        inference_model_name: cur.inference_model_name ?? preferredModel?.name ?? null,
      }));
    } catch {
      setRagOptions(fallbackRagOptions);
      setRagConfig((cur) => ({
        ...cur,
        project_id: cur.project_id ?? 1,
        knowledge_base_id: cur.knowledge_base_id ?? 291,
        knowledge_base_name: cur.knowledge_base_name ?? "BPJS-Claim-Knowledge",
        inference_model_id: cur.inference_model_id || "meta.llama3-8b-instruct-v1:0",
        inference_model_name: cur.inference_model_name ?? "Llama 3 8B Instruct",
      }));
    } finally {
      setRagOptionsLoading(false);
    }
  }

  async function ensureRagOptionsLoaded() {
    if (ragOptionsLoading) return;
    if (ragOptions && ragOptions.chat_models.length > 0 && ragOptions.knowledge_bases.length > 0) {
      return;
    }
    await loadRagOptions();
  }

  async function loadSavedRagConfig(sessionId: string) {
    try {
      const saved = await apiClient.getRagConfig(sessionId);
      setRagConfig((cur) => ({
        ...cur,
        session_id: sessionId,
        enabled: saved.enabled,
        session_name: saved.session_name || cur.session_name,
        project_id: saved.project_id ?? cur.project_id ?? 1,
        knowledge_base_id: saved.knowledge_base_id ?? cur.knowledge_base_id,
        knowledge_base_name: saved.knowledge_base_name ?? cur.knowledge_base_name,
        rag_session_id: saved.rag_session_id,
        inference_model_id: saved.inference_model_id ?? cur.inference_model_id,
        inference_model_name: saved.inference_model_name ?? cur.inference_model_name,
        rerank_model_id: saved.rerank_model_id ?? cur.rerank_model_id,
        rerank_model_name: saved.rerank_model_name ?? cur.rerank_model_name,
        response_chunks: saved.response_chunks || cur.response_chunks,
        query_configuration: saved.query_configuration ?? cur.query_configuration,
      }));
      setRagConfigDirty(false);
    } catch {
      setRagConfig((cur) => ({ ...cur, session_id: sessionId }));
      setRagConfigDirty(false);
    }
  }

  function toFriendlyErrorMessage(message: string) {
    const lowered = message.toLowerCase();
    if (lowered.includes("only select queries are allowed")) {
      return "That message couldn't be processed as a data question. Try asking about deposits, outstanding credit, or customer data.";
    }
    if (lowered.includes("table access is not allowed")) {
      return "That question references data outside this demo's scope. Try focusing on deposit and credit data.";
    }
    if (lowered.includes("request failed with status 500")) {
      return "The request couldn't be processed right now. Please try again with a more specific question.";
    }
    return message;
  }

  async function submitQuestion(input: string) {
    const trimmed = input.trim();
    const sessionId = state.sessionId || getOrCreateSessionId();
    if (!trimmed) {
      setState((cur) => ({ ...cur, error: "Please enter a question first." }));
      return;
    }
    if (ragConfig.enabled && (!ragConfig.rag_session_id || ragConfigDirty)) {
      setState((cur) => ({
        ...cur,
        error: "Save the RAG Studio configuration first before sending a knowledge-base question.",
      }));
      return;
    }

    const userMessage: ChatMessage = { id: `user-${Date.now()}`, role: "user", content: trimmed };
    setState((cur) => ({
      ...cur,
      sessionId,
      question: "",
      loading: true,
      error: "",
      messages: [...cur.messages, userMessage],
    }));

    try {
      const response: ChatResponsePayload = ragConfig.enabled && ragConfig.rag_session_id
        ? { kind: "answer", ...(await apiClient.chatAnswer({ question: trimmed, session_id: sessionId })) }
        : { kind: "query", ...(await apiClient.chatQuery({ question: trimmed, session_id: sessionId })) };

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer,
        sources: response.kind === "answer" ? response.sources ?? [] : [],
        metadata: response.metadata ?? {},
        visualization: response.visualization ?? null,
      };
      setState((cur) => ({
        ...cur,
        loading: false,
        sessionId,
        messages: [...cur.messages, assistantMessage],
      }));
    } catch (error) {
      setState((cur) => ({
        ...cur,
        loading: false,
        error: error instanceof Error ? toFriendlyErrorMessage(error.message) : "Request could not be processed right now.",
      }));
    }
  }

  async function saveRagConfig() {
    if (!state.sessionId) return;

    setRagSaving(true);
    try {
      const saved = await apiClient.saveRagConfig({
        ...ragConfig,
        session_id: state.sessionId,
      });
      setRagConfig(saved);
      setRagConfigDirty(false);
      setRagPanelOpen(false);
    } catch (error) {
      setState((cur) => ({
        ...cur,
        error: error instanceof Error ? toFriendlyErrorMessage(error.message) : "Unable to save RAG configuration.",
      }));
    } finally {
      setRagSaving(false);
    }
  }

  async function handleToggleRag(enabled: boolean) {
    await ensureRagOptionsLoaded();

    const nextConfig: RagSessionConfig = {
      ...ragConfig,
      enabled,
      session_id: state.sessionId,
    };

    setRagConfig(nextConfig);
    setRagConfigDirty(enabled || ragConfigDirty);

    if (enabled) {
      setRagPanelOpen(true);
      return;
    }

    if (ragConfig.rag_session_id) {
      setRagSaving(true);
      try {
        const saved = await apiClient.saveRagConfig({
          ...nextConfig,
          rag_session_id: null,
        });
        setRagConfig(saved);
        setRagConfigDirty(false);
      } catch (error) {
        setState((cur) => ({
          ...cur,
          error: error instanceof Error ? error.message : "Unable to disable RAG configuration.",
        }));
      } finally {
        setRagSaving(false);
      }
    }
  }

  function handleNewChat() {
    const sessionId = createNewSessionId();
    setState({ ...initialChatState, sessionId });
    setRagConfig(defaultRagConfig(sessionId));
    setRagPanelOpen(false);
    setRagConfigDirty(false);
  }

  function handleClearSession() {
    const sessionId = createNewSessionId();
    setState({ ...initialChatState, sessionId });
    setRagConfig(defaultRagConfig(sessionId));
    setRagPanelOpen(false);
    setRagConfigDirty(false);
  }

  const sidebar = (
    <AppSidebar
      brand={<BrandLogo />}
      items={navItems.map((item) => ({ ...item, active: true, onSelect: undefined }))}
      footer={
        <div className="mx-2 rounded-[18px] border border-white/8 bg-white/[0.04] p-4">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full rounded-[14px] border border-white/10 bg-[linear-gradient(135deg,#6970ff_0%,#5c63f2_100%)] py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(92,99,242,0.3)] transition hover:brightness-110"
          >
            + New Conversation
          </button>
          <div className="mt-4 flex items-center gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                <circle cx="7" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M2 12c0-2.761 2.239-4 5-4s5 1.239 5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-white/80">Analyst Workspace</p>
              <p className="text-[10px] text-white/40">Data Intelligence Platform</p>
            </div>
          </div>
        </div>
      }
    />
  );

  const dbStatus = health.loading
    ? "Checking…"
    : health.error
      ? "Unavailable"
      : health.db?.status === "ok"
        ? "Connected"
        : "Unavailable";

  const dbDot = health.loading
    ? "bg-amber-400"
    : health.error || health.db?.status !== "ok"
      ? "bg-rose-500"
      : "bg-emerald-400";
  const guardrailsBadge = getGuardrailsStatusBadge(health);

  const header = (
    <AppTopHeader
      left={
        <>
          <span className="meta-kicker hidden sm:block">Data Intelligence</span>
          <h2 className="font-headline text-base font-bold text-[var(--color-ink-strong)] sm:text-lg">
            Ask the Data
          </h2>
          <span className="hidden items-center gap-1.5 text-xs text-[var(--color-ink-subtle)] sm:inline-flex">
            <span className={`inline-block h-1.5 w-1.5 rounded-full ${dbDot}`} />
            Database {dbStatus}
          </span>
        </>
      }
      right={
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1 text-xs text-[var(--color-ink-subtle)] sm:flex">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M6 3v3l2 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Latest opened: {openedAt}
          </span>
          <button
            type="button"
            onClick={() => void refreshHealth()}
            className="rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)] transition hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)]"
          >
            Refresh status
          </button>
          <button
            type="button"
            onClick={() => {
              setRagPanelOpen(true);
              void ensureRagOptionsLoaded();
            }}
            className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-semibold transition ${
              ragConfig.enabled && ragConfig.rag_session_id
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)]"
            }`}
          >
            <span
              className={`relative h-4 w-7 rounded-full transition ${
                ragConfig.enabled && ragConfig.rag_session_id ? "bg-emerald-500" : "bg-[#c7ccda]"
              }`}
            >
              <span
                className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition ${
                  ragConfig.enabled && ragConfig.rag_session_id ? "left-3.5" : "left-0.5"
                }`}
              />
            </span>
            <span>{ragConfig.enabled && ragConfig.rag_session_id ? "RAG Studio On" : "RAG Studio"}</span>
          </button>
          <button
            type="button"
            onClick={handleClearSession}
            className="rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)] transition hover:border-rose-400 hover:text-rose-500"
          >
            Clear Session
          </button>
          {ragOptions?.enabled ? (
            <span className="hidden rounded-[var(--radius-pill)] bg-[rgba(92,99,242,0.12)] px-3 py-1.5 text-xs font-semibold text-[#4953d3] sm:inline-flex">
              {ragConfig.enabled && ragConfig.rag_session_id ? "RAG active" : "RAG Studio ready"}
            </span>
          ) : null}
          {guardrailsBadge ? (
            <div className="hidden sm:block">
              <StatusBadge label={guardrailsBadge.label} tone={guardrailsBadge.tone} />
            </div>
          ) : null}
        </div>
      }
    />
  );

  return (
    <AppShell sidebar={sidebar} header={header}>
      <PageCanvas>
        {/* Chat area */}
        <div className="flex min-h-[calc(100vh-var(--space-page-y)*2-6rem)] flex-col gap-4">
          {/* Messages / Welcome */}
          <div
            className="flex-1 overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-6 shadow-panel"
            style={{ minHeight: "400px" }}
          >
            {state.messages.length === 0 ? (
              <div className="mx-auto flex h-full max-w-4xl flex-col">
                {/* Welcome hero */}
                <section className="rounded-[18px] border border-[var(--color-border-soft)] bg-[var(--color-surface-muted)] px-8 py-10 text-center">
                  {/* Cloudera logo */}
                  <div className="mx-auto mb-5 relative h-10 w-44">
                    <Image
                      src="/Cloudera_logo.svg.png"
                      alt="Cloudera"
                      fill
                      className="object-contain"
                      sizes="176px"
                      priority
                    />
                  </div>
                  <h3 className="font-headline text-2xl font-bold tracking-tight text-[var(--color-ink-strong)]">
                    Hello, I am the Data Analyst Assistant.
                  </h3>
                  <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--color-ink-muted)]">
                    I&apos;m here to help you analyze deposit and credit data quickly using natural language. If you need answers grounded in policy or operational documents, enable RAG Studio from the top bar first.
                  </p>
                </section>

                {/* Starter cards */}
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {starterPrompts.map((item) => (
                    <StarterCard
                      key={item.title}
                      title={item.title}
                      description={item.description}
                      onClick={() => submitQuestion(item.prompt)}
                    />
                  ))}
                </div>

                {state.error ? (
                  <div className="mt-5">
                    <NoticePanel title="Request failed" message={state.error} tone="error" />
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
                {state.messages.map((message) => {
                  const guardrailsNotice = getGuardrailsNotice(message.metadata);

                  return message.role === "user" ? (
                    <UserMessageCard key={message.id} content={message.content} />
                  ) : (
                    <div key={message.id} className="flex w-full flex-col items-start gap-4">
                      <AnswerCard answer={message.content} sources={message.sources} />
                      {guardrailsNotice ? (
                        <div className="w-full max-w-[56rem]">
                          <NoticePanel
                            title={guardrailsNotice.title}
                            message={guardrailsNotice.message}
                            tone={guardrailsNotice.tone}
                          />
                        </div>
                      ) : null}
                      {message.visualization?.type ? (
                        <ResultChartCard visualization={message.visualization} />
                      ) : null}
                    </div>
                  );
                })}

                {state.loading ? (
                  <section className="w-full max-w-[56rem] rounded-[var(--radius-panel)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-panel">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <span
                            key={i}
                            className="inline-block h-2 w-2 animate-bounce rounded-full bg-[var(--color-action-primary)]"
                            style={{ animationDelay: `${i * 0.15}s` }}
                          />
                        ))}
                      </span>
                      <p className="text-sm text-[var(--color-ink-subtle)]">
                        Data Analyst Assistant is composing an answer…
                      </p>
                    </div>
                  </section>
                ) : null}

                {state.error ? (
                  <NoticePanel title="Request failed" message={state.error} tone="error" />
                ) : null}
              </div>
            )}
          </div>

          {/* Input */}
          <ChatInputPanel
            question={state.question}
            loading={state.loading}
            starterPrompts={starterPrompts.map((item) => item.prompt)}
            onQuestionChange={(question) => setState((cur) => ({ ...cur, question, error: "" }))}
            onStarterSelect={(prompt) => submitQuestion(prompt)}
            onSubmit={() => submitQuestion(state.question)}
          />
        </div>
      </PageCanvas>
      <RagConfigModal
        open={ragPanelOpen}
        saving={ragSaving}
        loadingOptions={ragOptionsLoading}
        ragAvailable={Boolean(ragOptions?.enabled)}
        ragConfigLocked={Boolean(ragConfig.enabled && ragConfig.rag_session_id && !ragConfigDirty)}
        config={ragConfig}
        chatModels={ragOptions?.chat_models ?? []}
        rerankModels={ragOptions?.rerank_models ?? []}
        knowledgeBases={ragOptions?.knowledge_bases ?? []}
        onClose={() => setRagPanelOpen(false)}
        onToggleEnabled={(enabled) => void handleToggleRag(enabled)}
        onConfigChange={(config) => {
          setRagConfig(config);
          setRagConfigDirty(true);
        }}
        onSave={() => void saveRagConfig()}
      />
    </AppShell>
  );
}
