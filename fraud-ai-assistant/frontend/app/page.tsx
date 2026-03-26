"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { AnswerCard } from "@/components/answer-card";
import { BrandLogo } from "@/components/brand-logo";
import { ChatInputPanel } from "@/components/chat-input-panel";
import { NoticePanel } from "@/components/notice-panel";
import { StarterCard } from "@/components/starter-card";
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
    title: "Saldo deposito",
    description: "Lihat total saldo deposito saat ini untuk gambaran umum portofolio.",
    prompt: "Berapa total saldo deposito saat ini?",
  },
  {
    title: "Outstanding kredit",
    description: "Ringkas total outstanding kredit untuk melihat eksposur pembiayaan saat ini.",
    prompt: "Berapa total outstanding kredit saat ini?",
  },
  {
    title: "Top debitur",
    description: "Temukan nasabah dengan outstanding kredit tertinggi pada data saat ini.",
    prompt: "Siapa nasabah dengan outstanding kredit tertinggi?",
  },
];

const initialState: ChatState = {
  sessionId: "",
  question: "",
  messages: [],
  loading: false,
  error: "",
};

export default function HomePage() {
  const [state, setState] = useState<ChatState>(initialState);
  const [health, setHealth] = useState<HealthState>({
    loading: true,
    app: null,
    db: null,
    error: "",
  });

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    setState((current) => ({ ...current, sessionId }));
  }, []);

  useEffect(() => {
    void refreshHealth();
  }, []);

  async function refreshHealth() {
    setHealth((current) => ({ ...current, loading: true, error: "" }));

    try {
      const [appHealth, dbHealth] = await Promise.all([
        apiClient.health(),
        apiClient.healthDb(),
      ]);
      setHealth({
        loading: false,
        app: appHealth,
        db: dbHealth,
        error: "",
      });
    } catch (error) {
      setHealth({
        loading: false,
        app: null,
        db: null,
        error: error instanceof Error ? error.message : "Unable to reach the backend.",
      });
    }
  }

  async function handleSubmit() {
    await submitQuestion(state.question);
  }

  function toFriendlyErrorMessage(message: string) {
    const lowered = message.toLowerCase();
    if (lowered.includes("only select queries are allowed")) {
      return "Saya belum bisa memproses pesan itu sebagai pertanyaan data. Coba tanyakan hal yang terkait data nasabah, deposito, atau kredit BNI.";
    }
    if (lowered.includes("table access is not allowed")) {
      return "Pertanyaan itu mengarah ke data di luar cakupan demo ini. Coba fokus ke data nasabah, deposito, dan kredit BNI.";
    }
    if (lowered.includes("request failed with status 500")) {
      return "Permintaan belum bisa diproses saat ini. Silakan coba lagi dengan pertanyaan yang lebih spesifik.";
    }
    return message;
  }

  async function submitQuestion(input: string) {
    const trimmedQuestion = input.trim();
    const sessionId = state.sessionId || getOrCreateSessionId();
    if (!trimmedQuestion) {
      setState((current) => ({
        ...current,
        error: "Tulis pertanyaan terlebih dahulu.",
      }));
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmedQuestion,
    };

    setState((current) => ({
      ...current,
      sessionId,
      question: "",
      loading: true,
      error: "",
      messages: [...current.messages, userMessage],
    }));

    try {
      const response: ChatAnswerResponse = await apiClient.chatAnswer({
        question: trimmedQuestion,
        session_id: sessionId,
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response.answer,
      };

      setState((current) => ({
        ...current,
        loading: false,
        sessionId,
        messages: [...current.messages, assistantMessage],
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error:
          error instanceof Error
            ? toFriendlyErrorMessage(error.message)
            : "Permintaan tidak dapat diproses saat ini.",
      }));
    }
  }

  function handleStarterSelect(question: string) {
    void submitQuestion(question);
  }

  function handleNewChat() {
    const sessionId = createNewSessionId();
    setState({
      ...initialState,
      sessionId,
    });
  }

  return (
    <main className="min-h-screen p-4 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1500px] gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-[34px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,251,245,0.96)_0%,rgba(255,246,234,0.93)_100%)] p-5 shadow-[0_32px_70px_rgba(146,64,14,0.12),0_12px_24px_rgba(15,23,42,0.06),inset_0_1px_0_rgba(255,255,255,0.9)] ring-1 ring-[#f2dec6]/80 backdrop-blur">
          <div className="flex h-full flex-col">
            <BrandLogo />

            <button
              type="button"
              onClick={handleNewChat}
              className="mt-8 rounded-[24px] border border-[#f0d2af] bg-gradient-to-r from-[#f97316] to-[#f59e0b] px-5 py-4 text-left text-sm font-semibold text-white shadow-[0_16px_32px_rgba(249,115,22,0.22)] transition hover:brightness-105"
            >
              + Mulai percakapan baru
            </button>

            <div className="mt-auto rounded-[26px] border border-white/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.95)_0%,rgba(255,250,244,0.92)_100%)] p-4 shadow-[0_22px_40px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.88)] ring-1 ring-[#f5e3ce]/70">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#fff1dc] to-[#ffe3bf] text-sm font-semibold text-[#9a3412] shadow-[0_10px_20px_rgba(245,158,11,0.18)]">
                  BNI
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    BNI Insight Desk
                  </p>
                  <p className="text-xs leading-5 text-slate-500">
                    Ruang kerja analisis data untuk percakapan yang lebih cepat.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-[#fffaf4] px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#f0c48c] hover:bg-[#fff3e3]"
                >
                  Settings
                </button>
                <button
                  type="button"
                  className="rounded-full border border-slate-200 bg-[#f7fbfa] px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-[#b9e2da] hover:bg-[#eef9f6]"
                >
                  Help
                </button>
              </div>
            </div>
          </div>
        </aside>

        <section className="relative flex min-h-[calc(100vh-2rem)] flex-col rounded-[36px] border border-white/95 bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,252,247,0.94)_100%)] shadow-[0_36px_90px_rgba(15,23,42,0.1),0_18px_36px_rgba(15,23,42,0.05),inset_0_1px_0_rgba(255,255,255,0.96)] ring-1 ring-black/[0.03] backdrop-blur">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-b-[28px] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.75),transparent_72%)]" />
          <header className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-[#f5eadb] px-6 py-5 lg:px-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#b45309]">
                BNI Insight Desk
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                Ask the Data
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void refreshHealth()}
                className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Refresh status
              </button>
            </div>
          </header>

          <div className="relative z-10 flex flex-1 flex-col px-4 pb-4 pt-4 lg:px-6 lg:pb-6">
            <div className="flex-1 overflow-y-auto rounded-[30px] border border-[#f7ead9] bg-[linear-gradient(180deg,rgba(255,255,255,0.96)_0%,rgba(255,250,244,0.92)_56%,rgba(244,252,250,0.9)_100%)] px-4 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_36px_rgba(15,23,42,0.04)] lg:px-6">
              {state.messages.length === 0 ? (
                <div className="mx-auto flex h-full max-w-5xl flex-col">
                  <section className="rounded-[34px] border border-white/90 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.18),transparent_26%),linear-gradient(180deg,#fffefb_0%,#fff7ed_100%)] px-6 py-10 text-center shadow-[0_22px_48px_rgba(245,158,11,0.08),inset_0_1px_0_rgba(255,255,255,0.92)] lg:px-10">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-[0_22px_36px_rgba(245,158,11,0.14)]">
                      <div className="relative h-16 w-16 overflow-hidden rounded-full">
                        <Image
                          src="/logo.svg.png"
                          alt="BNI logo"
                          fill
                          className="object-contain"
                          sizes="64px"
                          priority
                        />
                      </div>
                    </div>
                    <h3 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950">
                      Halo, saya Data Analyst Assistant.
                    </h3>
                    <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">
                      Saya di sini untuk membantu Anda memahami data nasabah,
                      deposito, dan kredit BNI dengan cara yang lebih mudah. Cukup ajukan
                      pertanyaan dalam bahasa natural, lalu saya bantu rangkum
                      jawabannya dengan jelas dan rapi.
                    </p>
                  </section>

                  <div className="mt-6 grid gap-4 lg:grid-cols-3">
                    {starterPrompts.map((item) => (
                      <StarterCard
                        key={item.title}
                        title={item.title}
                        description={item.description}
                        onClick={() => handleStarterSelect(item.prompt)}
                      />
                    ))}
                  </div>

                  {state.error ? (
                    <div className="mt-6">
                      <NoticePanel
                        title="Permintaan belum berhasil"
                        message={state.error}
                        tone="error"
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mx-auto flex max-w-4xl flex-col gap-5">
                  {state.messages.map((message) =>
                    message.role === "user" ? (
                      <div key={message.id} className="ml-auto max-w-[28rem]">
                        <div className="rounded-[26px] bg-[#073b3a] px-4 py-3 text-sm leading-6 text-white shadow-[0_18px_36px_rgba(7,59,58,0.14)]">
                          {message.content}
                        </div>
                      </div>
                    ) : (
                      <AnswerCard
                        key={message.id}
                        answer={message.content}
                      />
                    ),
                  )}

                  {state.loading ? (
                    <section className="rounded-[30px] border border-[#ffd6b0] bg-white p-6 shadow-panel">
                      <p className="text-sm font-medium text-slate-500">
                        BNI Data Analyst Assistant sedang menyusun jawaban...
                      </p>
                    </section>
                  ) : null}

                  {state.error ? (
                    <NoticePanel
                      title="Permintaan belum berhasil"
                      message={state.error}
                      tone="error"
                    />
                  ) : null}
                </div>
              )}
            </div>

            <div className="mt-4">
              <ChatInputPanel
                question={state.question}
                loading={state.loading}
                starterPrompts={starterPrompts.map((item) => item.prompt)}
                onQuestionChange={(question) =>
                  setState((current) => ({ ...current, question, error: "" }))
                }
                onStarterSelect={handleStarterSelect}
                onSubmit={() => void handleSubmit()}
              />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
