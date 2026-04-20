"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { AnswerCard } from "@/components/answer-card";
import { BrandLogo } from "@/components/brand-logo";
import { ChatInputPanel } from "@/components/chat-input-panel";
import { NoticePanel } from "@/components/notice-panel";
import { StarterCard } from "@/components/starter-card";
import {
  AppShell,
  AppSidebar,
  AppTopHeader,
  PageCanvas,
} from "@/components/ui/shell";
import {
  apiClient,
  type ChatAnswerResponse,
  type HealthResponse,
} from "@/lib/api";
import { createNewSessionId, getOrCreateSessionId } from "@/lib/session";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
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
  const [openedAt] = useState<string>(() => {
    const now = new Date();
    return now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
      ", " + now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  });

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    setState((cur) => ({ ...cur, sessionId }));
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, []);

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
      const response: ChatAnswerResponse = await apiClient.chatAnswer({
        question: trimmed,
        session_id: sessionId,
      });
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer,
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

  function handleNewChat() {
    setState({ ...initialChatState, sessionId: createNewSessionId() });
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
        </div>
      }
    />
  );

  return (
    <AppShell sidebar={sidebar} header={header}>
      <PageCanvas>
        {/* Chat area */}
        <div className="flex flex-col gap-4" style={{ minHeight: "calc(100vh - var(--shell-header-h) - var(--space-page-y) * 2)" }}>
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
                    I&apos;m here to help you understand your data — deposits, credit, customers, and more — using natural language. Just ask a question and I&apos;ll surface a clear, structured answer.
                  </p>
                </section>

                {/* Starter cards */}
                <div className="mt-6 grid gap-4 sm:grid-cols-3">
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
              <div className="mx-auto flex max-w-3xl flex-col gap-5">
                {state.messages.map((message) =>
                  message.role === "user" ? (
                    <div key={message.id} className="ml-auto max-w-[28rem]">
                      <div
                        className="rounded-[18px] px-4 py-3 text-sm leading-6 text-white shadow-panel"
                        style={{ background: "linear-gradient(135deg, #06293e 0%, #08004d 100%)" }}
                      >
                        {message.content}
                      </div>
                    </div>
                  ) : (
                    <AnswerCard key={message.id} answer={message.content} />
                  ),
                )}

                {state.loading ? (
                  <section className="max-w-[48rem] rounded-[var(--radius-panel)] border border-[var(--color-border-soft)] bg-[var(--color-surface)] p-5 shadow-panel">
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
    </AppShell>
  );
}
