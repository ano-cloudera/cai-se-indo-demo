"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { AnswerCard } from "@/components/answer-card";
import { BrandLogo } from "@/components/brand-logo";
import { ChatInputPanel } from "@/components/chat-input-panel";
import { DemoGuidePanel } from "@/components/demo-guide-panel";
import { DemoBriefingModal } from "@/components/demo-briefing-modal";
import { ModelSettingsPanel } from "@/components/model-settings-panel";
import { NoticePanel } from "@/components/notice-panel";
import { RagConfigModal } from "@/components/rag-config-modal";
import { ResultChartCard } from "@/components/result-chart-card";
import { StarterCard } from "@/components/starter-card";
import { UsageDashboardPanel } from "@/components/usage-dashboard-panel";
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
  type AnalyticsEventRecord,
  type AnalyticsSummaryResponse,
  type LLMProviderOption,
  type LLMProviderSelectionResponse,
  type RagOptionsResponse,
  type RagSessionConfig,
  type SessionStatePayload,
  type SessionSummary,
  type VisualizationSpec,
} from "@/lib/api";
import {
  createNewSessionId,
  getCurrentSessionId,
  getOrCreateSessionId,
  setCurrentSessionId,
} from "@/lib/session";

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

interface SessionsState {
  loading: boolean;
  items: SessionSummary[];
  error: string;
}

interface LLMProvidersState {
  loading: boolean;
  options: LLMProviderOption[];
  activeProvider: string;
  activeModelName: string;
  error: string;
}

interface AnalyticsState {
  loading: boolean;
  summary: AnalyticsSummaryResponse | null;
  events: AnalyticsEventRecord[];
  error: string;
}

type AppView = "assistant" | "settings" | "usage" | "guide";

const DEMO_BRIEFING_STORAGE_KEY = "ask-data-demo-briefing-seen";
const LLM_PROVIDER_STORAGE_KEY = "ask-data-llm-provider";
const LLM_MODEL_STORAGE_KEY = "ask-data-llm-model";

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
      title: "Sensitive Data Blocked",
      message: "PII request blocked. No sensitive customer data was retrieved or shown.",
      badgeLabel: "Guardrails",
      suggestion: "Try aggregate insights by city, segment, product, or region.",
      tone: "warning" as const,
    };
  }

  if (action === "redact") {
    return {
      title: "Response Sanitized",
      message: "Sensitive values were masked before display.",
      badgeLabel: "PII Protected",
      suggestion: "Continue with aggregate or trend questions.",
      tone: "warning" as const,
    };
  }

  return null;
}

function mapStoredSessionToMessages(session: SessionStatePayload): ChatMessage[] {
  return session.messages
    .filter(
      (
        message,
      ): message is SessionStatePayload["messages"][number] & { role: "user" | "assistant" } =>
        message.role === "user" || message.role === "assistant",
    )
    .map((message, index) => ({
      id: `${message.role}-${session.session_id}-${index}-${message.timestamp}`,
      role: message.role,
      content: message.content,
    }));
}

const initialChatState: ChatState = {
  sessionId: "",
  question: "",
  messages: [],
  loading: false,
  error: "",
};

const initialSessionsState: SessionsState = {
  loading: true,
  items: [],
  error: "",
};

const initialLlmProvidersState: LLMProvidersState = {
  loading: true,
  options: [],
  activeProvider: "azure",
  activeModelName: "",
  error: "",
};

const initialAnalyticsState: AnalyticsState = {
  loading: false,
  summary: null,
  events: [],
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
  {
    key: "settings",
    label: "Model Settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M9 3.2 10.2 2l1.8 1.1 2-.2.8 2 1.7 1-1 1.9.2 2-2 .8-1 1.7-1.9-1-2 .2-.8-2-1.7-1 1-1.9-.2-2 2-.8L9 3.2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
        <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    ),
  },
  {
    key: "usage",
    label: "Usage Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M3 14.5h12M4.5 11V7.5M9 11V4.5M13.5 11V8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    key: "guide",
    label: "Demo Guide",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
        <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H14v11.5H5.5A1.5 1.5 0 0 0 4 16V4.5Zm0 0A1.5 1.5 0 0 1 5.5 6H14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const demoBriefingSections = [
  {
    id: "use-case",
    label: "Use Case",
    title: "How This AI Analytics Experience Is Positioned",
    body:
      "Ask the Data is designed to show how business and analytics teams can explore portfolio questions through natural language while preserving governance, explainability, and operational speed in one experience.",
    bullets: [
      "Users can ask portfolio questions in plain language instead of waiting for manual SQL support.",
      "The application converts those questions into governed analytics across customer, deposit, and credit data.",
      "The workflow is designed for both business exploration and analyst productivity, not only for technical users.",
      "The same experience can support operational reviews, relationship planning, and executive portfolio discussions.",
    ],
  },
  {
    id: "data-scope",
    label: "Data Scope",
    title: "What Data Domains Are Included In The Demo",
    body:
      "The demo is intentionally focused on three connected data domains so the audience understands the analytical scope before they begin asking questions.",
    bullets: [
      "Customer data provides profile, segment, city, and lifecycle context for each portfolio relationship.",
      "Deposit data supports analysis of balances, maturity timing, and concentration by geography or segment.",
      "Credit data supports analysis of exposure, outstanding balances, and overall portfolio quality.",
      "The three domains are linked through customer relationships so cross-domain exploration is possible.",
    ],
  },
  {
    id: "business-value",
    label: "Business Value",
    title: "What Business Value This Solution Can Deliver",
    body:
      "This solution is positioned as an AI analytics layer that can reduce time-to-insight while keeping governance and operational boundaries intact.",
    bullets: [
      "Analysts and relationship teams can move from question to answer faster without relying on manual report preparation.",
      "Leaders can explore live portfolio questions during review meetings instead of depending only on static reporting packs.",
      "Guardrails help reduce the risk of exposing direct personal data during self-service usage.",
      "Structured answers and visual outputs make the results easier to validate, explain, and discuss with stakeholders.",
    ],
  },
  {
    id: "how-to-demo",
    label: "How To Demo",
    title: "How Sales Teams And Users Can Run The Demo",
    body:
      "The recommended self-service flow is to begin with broad aggregate questions, then move into trends, rankings, and governed follow-up requests while keeping the conversation anchored on business outcomes.",
    bullets: [
      "Start with total balances or total customer questions to establish credibility and context.",
      "Move into one trend or comparison example to show visual insight generation and follow-up flexibility.",
      "Use one sensitive request example to demonstrate governance controls and policy enforcement.",
      "Open RAG Studio only when the customer asks for policy-aware or document-grounded responses.",
    ],
  },
] as const;

const selfServiceThemes: Record<
  (typeof demoBriefingSections)[number]["id"],
  {
    shell: string;
    eyebrow: string;
    accent: string;
    badge: string;
    icon: string;
  }
> = {
  "use-case": {
    shell: "border-sky-200 bg-[linear-gradient(180deg,#f6fbff_0%,#eef7ff_100%)] hover:border-sky-300 hover:bg-[linear-gradient(180deg,#eff8ff_0%,#e8f3ff_100%)]",
    eyebrow: "text-sky-700",
    accent: "bg-sky-500",
    badge: "bg-sky-50 text-sky-700",
    icon: "M3.5 9.5 6.8 12.8 14.5 5.2",
  },
  "data-scope": {
    shell: "border-emerald-200 bg-[linear-gradient(180deg,#f5fff9_0%,#edf9f2_100%)] hover:border-emerald-300 hover:bg-[linear-gradient(180deg,#effcf5_0%,#e7f6ee_100%)]",
    eyebrow: "text-emerald-700",
    accent: "bg-emerald-500",
    badge: "bg-emerald-50 text-emerald-700",
    icon: "M4 5.5h10M4 9h10M4 12.5h6",
  },
  "business-value": {
    shell: "border-amber-200 bg-[linear-gradient(180deg,#fffaf1_0%,#fff4de_100%)] hover:border-amber-300 hover:bg-[linear-gradient(180deg,#fff7ea_0%,#fff0d3_100%)]",
    eyebrow: "text-amber-700",
    accent: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700",
    icon: "M8.25 3 4.5 9.25h3L6.75 15l5.75-8H9.5L13 3h-4.75Z",
  },
  "how-to-demo": {
    shell: "border-rose-200 bg-[linear-gradient(180deg,#fff7f8_0%,#fff0f4_100%)] hover:border-rose-300 hover:bg-[linear-gradient(180deg,#fff3f5_0%,#ffe8ef_100%)]",
    eyebrow: "text-rose-700",
    accent: "bg-rose-500",
    badge: "bg-rose-50 text-rose-700",
    icon: "M4.5 4.5h9v9h-9zM7 7h4M7 9.5h4",
  },
};

export default function HomePage() {
  const submitInFlightRef = useRef(false);
  const [state, setState] = useState<ChatState>(initialChatState);
  const [sessions, setSessions] = useState<SessionsState>(initialSessionsState);
  const [llmProviders, setLlmProviders] = useState<LLMProvidersState>(initialLlmProvidersState);
  const [analytics, setAnalytics] = useState<AnalyticsState>(initialAnalyticsState);
  const [activeView, setActiveView] = useState<AppView>("assistant");
  const [draftProvider, setDraftProvider] = useState("azure");
  const [draftModelId, setDraftModelId] = useState("");
  const [savingModelSettings, setSavingModelSettings] = useState(false);
  const [demoBriefingOpen, setDemoBriefingOpen] = useState(false);
  const [activeBriefingSection, setActiveBriefingSection] = useState<string>(
    demoBriefingSections[0].id,
  );
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
  const [ragPanelPreparing, setRagPanelPreparing] = useState(false);

  useEffect(() => {
    const sessionId = getCurrentSessionId() || getOrCreateSessionId();
    setCurrentSessionId(sessionId);
    setState((cur) => ({ ...cur, sessionId }));
    setRagConfig(defaultRagConfig(sessionId));
    void loadSessionHistory(sessionId);

    const seenBriefing = window.localStorage.getItem(DEMO_BRIEFING_STORAGE_KEY);
    if (!seenBriefing) {
      setDemoBriefingOpen(true);
    }
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, []);

  useEffect(() => {
    void refreshSessions();
  }, []);

  useEffect(() => {
    void ensureRagOptionsLoaded();
  }, []);

  useEffect(() => {
    if (!state.sessionId) return;
    void loadSavedRagConfig(state.sessionId);
    void loadLlmProviders(state.sessionId);
  }, [state.sessionId]);

  useEffect(() => {
    if (activeView === "usage" && !analytics.loading && !analytics.summary) {
      void refreshAnalytics();
    }
  }, [activeView, analytics.loading, analytics.summary]);

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

  async function refreshSessions() {
    setSessions((cur) => ({ ...cur, loading: true, error: "" }));
    try {
      const response = await apiClient.listSessions(20);
      setSessions({
        loading: false,
        items: response.sessions,
        error: "",
      });
    } catch (error) {
      setSessions({
        loading: false,
        items: [],
        error: error instanceof Error ? error.message : "Unable to load saved sessions.",
      });
    }
  }

  async function refreshAnalytics() {
    setAnalytics((cur) => ({ ...cur, loading: true, error: "" }));
    try {
      const [summary, events] = await Promise.all([
        apiClient.getAnalyticsSummary(30),
        apiClient.getAnalyticsEvents(20),
      ]);
      setAnalytics({
        loading: false,
        summary,
        events: events.events,
        error: "",
      });
    } catch (error) {
      setAnalytics({
        loading: false,
        summary: null,
        events: [],
        error: error instanceof Error ? error.message : "Unable to load usage analytics.",
      });
    }
  }

  async function loadLlmProviders(sessionId: string) {
    setLlmProviders((cur) => ({ ...cur, loading: true, error: "" }));
    try {
      let response = await apiClient.getLlmProviders(sessionId);
      const storedProvider =
        typeof window !== "undefined" ? window.localStorage.getItem(LLM_PROVIDER_STORAGE_KEY) : null;
      if (
        storedProvider &&
        storedProvider !== response.active_provider &&
        response.options.some((option) => option.provider === storedProvider)
      ) {
        const selected = await apiClient.selectLlmProvider({
          session_id: sessionId,
          provider: storedProvider,
        });
        response = {
          ...response,
          active_provider: selected.active_provider,
          active_model_id: selected.active_model_id,
          active_model_name: selected.active_model_name,
        };
      }
      const preferredProvider =
        storedProvider && response.options.some((option) => option.provider === storedProvider)
          ? storedProvider
          : response.active_provider;
      const preferredModels = response.options.filter((option) => option.provider === preferredProvider);
      const storedModelId =
        typeof window !== "undefined" ? window.localStorage.getItem(LLM_MODEL_STORAGE_KEY) : null;
      const preferredModelId =
        storedModelId && preferredModels.some((option) => option.model_id === storedModelId)
          ? storedModelId
          : preferredModels[0]?.model_id || "";

      setLlmProviders({
        loading: false,
        options: response.options,
        activeProvider: response.active_provider,
        activeModelName: response.active_model_name || "",
        error: "",
      });
      setDraftProvider(preferredProvider);
      setDraftModelId(preferredModelId);
    } catch (error) {
      setLlmProviders({
        loading: false,
        options: [],
        activeProvider: "azure",
        activeModelName: "",
        error: error instanceof Error ? error.message : "Unable to load model providers.",
      });
      setDraftProvider("azure");
      setDraftModelId("");
    }
  }

  async function handleLlmProviderChange(nextProvider: string) {
    const sessionId = state.sessionId || getOrCreateSessionId();
    setLlmProviders((cur) => ({ ...cur, loading: true, error: "" }));
    try {
      const response: LLMProviderSelectionResponse = await apiClient.selectLlmProvider({
        session_id: sessionId,
        provider: nextProvider,
      });
      setLlmProviders((cur) => ({
        ...cur,
        loading: false,
        activeProvider: response.active_provider,
        activeModelName: response.active_model_name || "",
      }));
      await refreshSessions();
      if (activeView === "usage" || analytics.summary) {
        void refreshAnalytics();
      }
      return true;
    } catch (error) {
      setLlmProviders((cur) => ({
        ...cur,
        loading: false,
        error: error instanceof Error ? error.message : "Unable to switch model provider.",
      }));
      setState((cur) => ({
        ...cur,
        error: error instanceof Error ? toFriendlyErrorMessage(error.message) : "Unable to switch model provider.",
      }));
      return false;
    }
  }

  async function saveModelSettings() {
    if (!draftProvider) return;

    setSavingModelSettings(true);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(LLM_PROVIDER_STORAGE_KEY, draftProvider);
        if (draftModelId) {
          window.localStorage.setItem(LLM_MODEL_STORAGE_KEY, draftModelId);
        }
      }
      const saved = await handleLlmProviderChange(draftProvider);
      if (saved) {
        setActiveView("assistant");
      }
    } finally {
      setSavingModelSettings(false);
    }
  }

  async function loadSessionHistory(sessionId: string) {
    try {
      const response = await apiClient.getSession(sessionId);
      const restoredMessages = mapStoredSessionToMessages(response.session);
      setState((cur) => ({
        ...cur,
        sessionId,
        messages: restoredMessages,
        error: "",
      }));
    } catch {
      setState((cur) => ({ ...cur, sessionId, messages: [] }));
    }
  }

  async function handleSelectSession(sessionId: string) {
    if (!sessionId || sessionId === state.sessionId) return;
    setCurrentSessionId(sessionId);
    setActiveView("assistant");
    setState((cur) => ({
      ...cur,
      sessionId,
      question: "",
      loading: false,
      error: "",
      messages: [],
    }));
    setRagPanelOpen(false);
    setRagConfig(defaultRagConfig(sessionId));
    setRagConfigDirty(false);
    await loadSessionHistory(sessionId);
    await loadSavedRagConfig(sessionId);
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

  async function openRagPanel() {
    if (ragPanelPreparing) return;

    const hasOptions =
      Boolean(ragOptions) &&
      (ragOptions?.chat_models.length ?? 0) > 0 &&
      (ragOptions?.knowledge_bases.length ?? 0) > 0;

    if (hasOptions) {
      setRagPanelOpen(true);
      return;
    }

    setRagPanelPreparing(true);
    try {
      await ensureRagOptionsLoaded();
      setRagPanelOpen(true);
    } finally {
      setRagPanelPreparing(false);
    }
  }

  function openGuideView(sectionId?: string) {
    if (sectionId) {
      setActiveBriefingSection(sectionId);
    }
    setActiveView("guide");
  }

  function closeDemoBriefing() {
    window.localStorage.setItem(DEMO_BRIEFING_STORAGE_KEY, "true");
    setDemoBriefingOpen(false);
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
    if (submitInFlightRef.current) return;
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
    submitInFlightRef.current = true;
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
    } finally {
      submitInFlightRef.current = false;
      void refreshSessions();
      if (activeView === "usage" || analytics.summary) {
        void refreshAnalytics();
      }
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
      void openRagPanel();
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
    setCurrentSessionId(sessionId);
    setActiveView("assistant");
    setState({ ...initialChatState, sessionId });
    setLlmProviders(initialLlmProvidersState);
    setRagConfig(defaultRagConfig(sessionId));
    setRagPanelOpen(false);
    setRagConfigDirty(false);
  }

  function handleClearSession() {
    const sessionId = createNewSessionId();
    setCurrentSessionId(sessionId);
    setState({ ...initialChatState, sessionId });
    setLlmProviders(initialLlmProvidersState);
    setRagConfig(defaultRagConfig(sessionId));
    setRagPanelOpen(false);
    setRagConfigDirty(false);
    setActiveView("assistant");
  }

  const sidebar = (
    <AppSidebar
      brand={<BrandLogo />}
      items={navItems.map((item) => ({
        ...item,
        active: item.key === activeView,
        onSelect: () => {
          setActiveView(item.key as AppView);
          if (item.key === "usage" && !analytics.summary && !analytics.loading) {
            void refreshAnalytics();
          }
        },
      }))}
      footer={
        <div className="mx-2 rounded-[18px] border border-white/8 bg-white/[0.04] p-4">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full rounded-[14px] border border-white/10 bg-[linear-gradient(135deg,#6970ff_0%,#5c63f2_100%)] py-2.5 text-sm font-semibold text-white shadow-[0_10px_20px_rgba(92,99,242,0.3)] transition hover:brightness-110"
          >
            + New Conversation
          </button>
          <div className="mt-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/45">
              Recent Sessions
            </p>
            <div className="mt-2 space-y-2">
              {sessions.items.slice(0, 4).map((session) => (
                <button
                  key={session.session_id}
                  type="button"
                  onClick={() => void handleSelectSession(session.session_id)}
                  className={`w-full rounded-[12px] border px-3 py-2 text-left transition ${
                    state.sessionId === session.session_id
                      ? "border-[#6c74ff] bg-white/10"
                      : "border-white/8 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
                  }`}
                >
                  <p className="truncate text-[12px] font-semibold text-white/90">{session.title}</p>
                  <p className="mt-1 truncate text-[10px] text-white/45">
                    {session.last_user_message || "Open saved conversation"}
                  </p>
                </button>
              ))}
              {!sessions.loading && sessions.items.length === 0 ? (
                <p className="rounded-[12px] border border-dashed border-white/10 px-3 py-2 text-[10px] text-white/35">
                  No saved sessions yet.
                </p>
              ) : null}
            </div>
          </div>
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
          <button
            type="button"
            onClick={() => void refreshHealth()}
            className="rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-ink-muted)] transition hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)]"
          >
            Refresh status
          </button>
          <button
            type="button"
            disabled={ragPanelPreparing}
            onClick={() => void openRagPanel()}
            className={`inline-flex items-center gap-2 rounded-[var(--radius-pill)] border px-3 py-1.5 text-xs font-semibold transition ${
              ragConfig.enabled && ragConfig.rag_session_id
                ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                : "border-[var(--color-border-strong)] bg-[var(--color-surface)] text-[var(--color-ink-muted)] hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)]"
            } ${ragPanelPreparing ? "cursor-wait opacity-70" : ""}`}
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
            <span>
              {ragPanelPreparing
                ? "Opening..."
                : ragConfig.enabled && ragConfig.rag_session_id
                  ? "RAG Studio On"
                  : "RAG Studio"}
            </span>
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
              RAG Studio ready
            </span>
          ) : null}
        </div>
      }
    />
  );

  return (
    <AppShell sidebar={sidebar} header={header}>
      <PageCanvas>
        {activeView === "assistant" ? (
          <div className="flex min-h-[calc(100vh-var(--space-page-y)*2-6rem)] flex-col gap-4">
            <div
              className="flex-1 overflow-y-auto rounded-[var(--radius-panel)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-6 shadow-panel"
              style={{ minHeight: "400px" }}
            >
              {state.messages.length === 0 ? (
                <div className="mx-auto flex h-full max-w-4xl flex-col">
                  <section className="rounded-[18px] border border-[var(--color-border-soft)] bg-[linear-gradient(180deg,#ffffff_0%,#f5f8ff_100%)] px-8 py-10 text-center">
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
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => openGuideView("use-case")}
                        className="rounded-[var(--radius-pill)] bg-[var(--color-action-primary)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--color-action-primary-hover)]"
                      >
                        Open Demo Guide
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveView("settings");
                        }}
                        className="rounded-[var(--radius-pill)] border border-[var(--color-border-strong)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink-muted)] transition hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)]"
                      >
                        Review Model Settings
                      </button>
                    </div>
                  </section>

                  <section className="mt-6 rounded-[20px] border border-[var(--color-border-soft)] bg-[linear-gradient(180deg,#ffffff_0%,#fbfcff_100%)] p-6 shadow-panel">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--color-ink-subtle)]">
                          Self-Service Menu
                        </p>
                        <h4 className="mt-2 font-headline text-xl font-bold text-[var(--color-ink-strong)]">
                          Pick The Right Starting Point
                        </h4>
                        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--color-ink-muted)]">
                          Open the area that best matches the conversation you want to lead, whether the goal is framing the use case, clarifying the data scope, landing the business value, or guiding the demo flow.
                        </p>
                      </div>
                    </div>
                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      {demoBriefingSections.map((section, index) => {
                        const theme = selfServiceThemes[section.id];
                        return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => openGuideView(section.id)}
                          className={`group relative overflow-hidden rounded-[20px] border px-5 py-5 text-left shadow-[0_14px_34px_rgba(15,23,42,0.04)] transition ${theme.shell}`}
                        >
                          <span className={`absolute inset-x-0 top-0 h-1 ${theme.accent}`} />
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${theme.eyebrow}`}>
                                Section {index + 1}
                              </p>
                              <p className="mt-3 font-headline text-[13px] font-bold uppercase tracking-[0.2em] text-[var(--color-ink-strong)]">
                                {section.label}
                              </p>
                            </div>
                            <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${theme.badge}`}>
                              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                                <path
                                  d={theme.icon}
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </span>
                          </div>
                          <p className="mt-4 text-[15px] leading-7 text-[var(--color-ink-muted)]">
                            {section.body}
                          </p>
                          <div className="mt-5 flex items-center justify-between">
                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] ${theme.badge}`}>
                              Open Guide
                            </span>
                            <span className="text-sm font-semibold text-[var(--color-ink-strong)] transition group-hover:translate-x-0.5">
                              Review
                            </span>
                          </div>
                        </button>
                        );
                      })}
                    </div>
                  </section>

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
                              badgeLabel={guardrailsNotice.badgeLabel}
                              suggestion={guardrailsNotice.suggestion}
                              compact
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

            <ChatInputPanel
              question={state.question}
              loading={state.loading}
              starterPrompts={starterPrompts.map((item) => item.prompt)}
              onQuestionChange={(question) => setState((cur) => ({ ...cur, question, error: "" }))}
              onStarterSelect={(prompt) => submitQuestion(prompt)}
              onSubmit={() => submitQuestion(state.question)}
            />
          </div>
        ) : null}

        {activeView === "guide" ? (
          <DemoGuidePanel
            sections={[...demoBriefingSections]}
            activeSectionId={activeBriefingSection}
            onSelectSection={setActiveBriefingSection}
          />
        ) : null}

        {activeView === "usage" ? (
          <UsageDashboardPanel
            loading={analytics.loading}
            error={analytics.error}
            summary={analytics.summary}
            events={analytics.events}
            onRefresh={() => void refreshAnalytics()}
          />
        ) : null}

        {activeView === "settings" ? (
          <ModelSettingsPanel
            loading={llmProviders.loading}
            error={llmProviders.error}
            options={llmProviders.options}
            activeProvider={llmProviders.activeProvider}
            activeModelName={llmProviders.activeModelName}
            draftProvider={draftProvider}
            draftModelId={draftModelId}
            saving={savingModelSettings}
            onProviderChange={(provider) => {
              setDraftProvider(provider);
              const firstModel = llmProviders.options.find((option) => option.provider === provider);
              setDraftModelId(firstModel?.model_id || "");
            }}
            onModelChange={setDraftModelId}
            onSave={() => void saveModelSettings()}
          />
        ) : null}
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
      <DemoBriefingModal
        open={demoBriefingOpen}
        sections={[...demoBriefingSections]}
        activeSectionId={activeBriefingSection}
        onSelectSection={setActiveBriefingSection}
        onClose={closeDemoBriefing}
      />
    </AppShell>
  );
}
