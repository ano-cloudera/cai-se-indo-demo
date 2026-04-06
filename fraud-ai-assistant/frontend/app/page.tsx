"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PanelCard, PanelHeader, StatCard } from "@/components/ui/card";
import { TextInput } from "@/components/ui/input";
import { AppIcon } from "@/components/ui/icon";
import {
  FilterBar,
  FilterGroup,
  MetricGrid,
  PageCanvas,
  PageHeaderBlock,
  PageSection,
  SidebarNavButton,
  StickyRail,
} from "@/components/ui/shell";
import { DataTable, TableCard, TableCell, TableHeadCell } from "@/components/ui/table";
import type { ChatQueryResponse, HealthResponse, SQLExecuteResponse } from "@/lib/api";
import { apiClient } from "@/lib/api";
import { cn } from "@/lib/cn";
import { createNewSessionId, getOrCreateSessionId } from "@/lib/session";

type ViewKey = "dashboard" | "assistant" | "investigations" | "models";
type RiskLevel = "critical" | "high" | "medium";

interface DashboardSummary {
  totalTransactions: number;
  flaggedTransactions: number;
  fraudRatePct: number;
  highRiskEvents: number;
  averageProbabilityPct: number;
  activeAlerts: number;
}

interface TrendPoint {
  label: string;
  totalTransactions: number;
  fraudTransactions: number;
}

interface BreakdownPoint {
  label: string;
  totalTransactions: number;
  fraudTransactions: number;
}

interface ModalityPoint {
  label: string;
  sharePct: number;
}

interface SuspiciousTransaction {
  transactionId: number;
  transactionTimestamp: string;
  customerId: number;
  amount: number;
  channel: string;
  fraudFlag: number;
  fraudReason: string;
  combinedRiskScore: number;
  originCity: string;
  destinationCity: string;
  deviceOs: string;
  isNewDevice: number;
  isForeignIp: number;
  failedLoginCount24h: number;
}

interface DashboardState {
  loading: boolean;
  error: string;
  usingFallback: boolean;
  summary: DashboardSummary;
  trend: TrendPoint[];
  channels: BreakdownPoint[];
  cities: BreakdownPoint[];
  modalities: ModalityPoint[];
  suspicious: SuspiciousTransaction[];
}

interface HealthState {
  loading: boolean;
  usingFallback: boolean;
  app: HealthResponse | null;
  db: HealthResponse | null;
  error: string;
}

interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  note?: string;
  table?: Array<{
    transactionId: string;
    probability: string;
    riskLevel: RiskLevel;
    status: string;
  }>;
}

interface AssistantState {
  sessionId: string;
  question: string;
  loading: boolean;
  messages: AssistantMessage[];
}

const navigation: Array<{
  key: ViewKey;
  label: string;
  icon: string;
  title: string;
  subtitle: string;
}> = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "dashboard",
    title: "Fraud Overview",
    subtitle:
      "Monitor fraud signals, suspicious transaction activity, model scoring health, and alert workload.",
  },
  {
    key: "assistant",
    label: "AI Assistant",
    icon: "smart_toy",
    title: "Fraud AI Assistant",
    subtitle:
      "Ask questions about fraud activity, suspicious transactions, scoring results, and investigation context.",
  },
  {
    key: "investigations",
    label: "Investigations",
    icon: "policy",
    title: "Investigations",
    subtitle:
      "Review suspicious transactions, linked entities, investigation status, and analyst actions.",
  },
  {
    key: "models",
    label: "Model Management",
    icon: "hub",
    title: "Model Management",
    subtitle:
      "Monitor deployed fraud models, scoring readiness, deployment artifacts, and API contract health.",
  },
];

const DASHBOARD_SQL = {
  summary: `
    SELECT
      COUNT(*) AS total_transactions,
      SUM(CASE WHEN fraud_flag = 1 THEN 1 ELSE 0 END) AS flagged_transactions,
      ROUND(
        100.0 * SUM(CASE WHEN fraud_flag = 1 THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
        2
      ) AS fraud_rate_pct,
      SUM(CASE WHEN ((velocity_risk_score + behavioral_risk_score) / 2.0) >= 0.80 THEN 1 ELSE 0 END) AS high_risk_events,
      ROUND(AVG(((velocity_risk_score + behavioral_risk_score) / 2.0) * 100.0), 2) AS average_probability_pct,
      SUM(CASE WHEN ((velocity_risk_score + behavioral_risk_score) / 2.0) >= 0.65 THEN 1 ELSE 0 END) AS active_alerts
    FROM fraud_transactions
  `,
  trend: `
    SELECT
      transaction_date,
      COUNT(*) AS total_transactions,
      SUM(CASE WHEN fraud_flag = 1 THEN 1 ELSE 0 END) AS fraud_transactions
    FROM fraud_transactions
    GROUP BY transaction_date
    ORDER BY transaction_date DESC
    LIMIT 10
  `,
  channels: `
    SELECT
      channel,
      COUNT(*) AS total_transactions,
      SUM(CASE WHEN fraud_flag = 1 THEN 1 ELSE 0 END) AS fraud_transactions
    FROM fraud_transactions
    GROUP BY channel
    ORDER BY total_transactions DESC
    LIMIT 4
  `,
  cities: `
    SELECT
      origin_city,
      COUNT(*) AS total_transactions,
      SUM(CASE WHEN fraud_flag = 1 THEN 1 ELSE 0 END) AS fraud_transactions
    FROM fraud_transactions
    GROUP BY origin_city
    ORDER BY fraud_transactions DESC, total_transactions DESC
    LIMIT 6
  `,
  suspicious: `
    SELECT
      transaction_id,
      transaction_timestamp,
      customer_id,
      amount,
      channel,
      fraud_flag,
      fraud_reason,
      origin_city,
      destination_city,
      device_os,
      is_new_device,
      is_foreign_ip,
      failed_login_count_24h,
      ROUND((velocity_risk_score + behavioral_risk_score) / 2.0, 4) AS combined_risk_score
    FROM fraud_transactions
    ORDER BY
      ROUND((velocity_risk_score + behavioral_risk_score) / 2.0, 4) DESC,
      amount DESC
    LIMIT 8
  `,
  modalities: `
    SELECT 'Velocity Spike' AS label, SUM(CASE WHEN velocity_risk_score >= 0.80 THEN 1 ELSE 0 END) AS signal_count FROM fraud_transactions
    UNION ALL
    SELECT 'New Device Link' AS label, SUM(CASE WHEN is_new_device = 1 THEN 1 ELSE 0 END) AS signal_count FROM fraud_transactions
    UNION ALL
    SELECT 'Foreign IP Access' AS label, SUM(CASE WHEN is_foreign_ip = 1 THEN 1 ELSE 0 END) AS signal_count FROM fraud_transactions
    UNION ALL
    SELECT 'Account Friction' AS label, SUM(CASE WHEN failed_login_count_24h >= 2 THEN 1 ELSE 0 END) AS signal_count FROM fraud_transactions
  `,
} as const;

const FALLBACK_SUMMARY: DashboardSummary = {
  totalTransactions: 1_200_000,
  flaggedTransactions: 4_203,
  fraudRatePct: 0.35,
  highRiskEvents: 856,
  averageProbabilityPct: 62,
  activeAlerts: 124,
};

const FALLBACK_TREND: TrendPoint[] = [
  { label: "00:00", totalTransactions: 180_000, fraudTransactions: 120 },
  { label: "04:00", totalTransactions: 205_000, fraudTransactions: 158 },
  { label: "08:00", totalTransactions: 240_000, fraudTransactions: 104 },
  { label: "12:00", totalTransactions: 260_000, fraudTransactions: 245 },
  { label: "16:00", totalTransactions: 221_000, fraudTransactions: 130 },
  { label: "20:00", totalTransactions: 248_000, fraudTransactions: 280 },
];

const FALLBACK_CHANNELS: BreakdownPoint[] = [
  { label: "Web", totalTransactions: 770_000, fraudTransactions: 2_700 },
  { label: "Mobile", totalTransactions: 265_000, fraudTransactions: 928 },
  { label: "POS", totalTransactions: 102_000, fraudTransactions: 357 },
  { label: "ATM", totalTransactions: 63_000, fraudTransactions: 218 },
];

const FALLBACK_CITIES: BreakdownPoint[] = [
  { label: "North America", totalTransactions: 410_000, fraudTransactions: 1_768 },
  { label: "Western Europe", totalTransactions: 265_000, fraudTransactions: 1_177 },
  { label: "Southeast Asia", totalTransactions: 187_000, fraudTransactions: 631 },
  { label: "Jakarta", totalTransactions: 148_000, fraudTransactions: 520 },
  { label: "Bandung", totalTransactions: 120_000, fraudTransactions: 404 },
  { label: "Surabaya", totalTransactions: 95_000, fraudTransactions: 299 },
];

const FALLBACK_MODALITIES: ModalityPoint[] = [
  { label: "Velocity Spike", sharePct: 84 },
  { label: "New Device Link", sharePct: 62 },
  { label: "Foreign IP Access", sharePct: 45 },
  { label: "Account Friction", sharePct: 28 },
];

const FALLBACK_SUSPICIOUS: SuspiciousTransaction[] = [
  {
    transactionId: 94021,
    transactionTimestamp: "2026-03-30 08:24:11",
    customerId: 8820,
    amount: 4200,
    channel: "Web",
    fraudFlag: 1,
    fraudReason: "New device + foreign IP + rapid transaction velocity",
    combinedRiskScore: 0.984,
    originCity: "Jakarta",
    destinationCity: "Frankfurt",
    deviceOs: "Windows",
    isNewDevice: 1,
    isForeignIp: 1,
    failedLoginCount24h: 4,
  },
  {
    transactionId: 94018,
    transactionTimestamp: "2026-03-30 08:21:45",
    customerId: 1145,
    amount: 850,
    channel: "Mobile",
    fraudFlag: 1,
    fraudReason: "Beneficiary change followed by large transfer attempt",
    combinedRiskScore: 0.841,
    originCity: "Bandung",
    destinationCity: "Singapore",
    deviceOs: "Android",
    isNewDevice: 1,
    isForeignIp: 0,
    failedLoginCount24h: 1,
  },
  {
    transactionId: 94015,
    transactionTimestamp: "2026-03-30 08:18:02",
    customerId: 5601,
    amount: 1120,
    channel: "Web",
    fraudFlag: 1,
    fraudReason: "Proxy or VPN detected during transaction burst",
    combinedRiskScore: 0.785,
    originCity: "Surabaya",
    destinationCity: "Tokyo",
    deviceOs: "macOS",
    isNewDevice: 0,
    isForeignIp: 1,
    failedLoginCount24h: 2,
  },
  {
    transactionId: 94012,
    transactionTimestamp: "2026-03-30 08:15:33",
    customerId: 2291,
    amount: 45,
    channel: "ATM",
    fraudFlag: 0,
    fraudReason: "Out-of-pattern withdrawal timing",
    combinedRiskScore: 0.62,
    originCity: "Medan",
    destinationCity: "Medan",
    deviceOs: "ATM Terminal",
    isNewDevice: 0,
    isForeignIp: 0,
    failedLoginCount24h: 0,
  },
];

const INITIAL_ASSISTANT_MESSAGES: AssistantMessage[] = [
  {
    id: "seed-user-1",
    role: "user",
    text: "Why was transaction TXN-209384 flagged as suspicious?",
  },
  {
    id: "seed-ai-1",
    role: "assistant",
    text:
      "TXN-209384 was flagged due to multiple high-risk signals: new device, foreign IP address, and a velocity spike within a short time window.",
    note: "Recommended action: Freeze account and request review.",
  },
  {
    id: "seed-user-2",
    role: "user",
    text: "Show the highest risk transactions in the last 24 hours.",
  },
  {
    id: "seed-ai-2",
    role: "assistant",
    text: "Here are the top three high-risk transactions from the latest fraud queue.",
    table: [
      { transactionId: "TXN-992102", probability: "98.4%", riskLevel: "critical", status: "Pending" },
      { transactionId: "TXN-110293", probability: "92.1%", riskLevel: "high", status: "Reviewing" },
      { transactionId: "TXN-003948", probability: "89.7%", riskLevel: "high", status: "Queued" },
    ],
  },
];

const modelManagement = {
  activeModel: "random_forest",
  version: "champion bundle",
  status: "Online",
  health: "100%",
  lastTrained: "Latest package",
  deploymentType: "CAI deployment",
  endpointContract: "{ predictions: [{ fraud_probability, predicted_label, model_name }] }",
  artifactLocation: "deployment_artifacts/champion",
  championArtifacts: [
    "pipeline.joblib",
    "feature_metadata.json",
    "champion_run.json",
    "model_version.json",
  ],
  metrics: {
    precision: null as number | null,
    recall: null as number | null,
    f1: null as number | null,
    rocAuc: null as number | null,
  },
  runs: [
    {
      version: "champion bundle",
      trainingDate: "Latest package",
      auc: "Pending sync",
      status: "deployed",
      deployedBy: "CAI model deployment",
    },
  ],
};

function formatInteger(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatProbability(value: number) {
  return `${(value * 100).toFixed(1)}%`;
}

function toNumber(value: unknown) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    return Number(value);
  }
  return 0;
}

function toString(value: unknown) {
  if (value == null) {
    return "";
  }
  return String(value);
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 0.95) {
    return "critical";
  }
  if (score >= 0.75) {
    return "high";
  }
  return "medium";
}

function getRiskLabel(level: RiskLevel) {
  if (level === "critical") {
    return "Critical";
  }
  if (level === "high") {
    return "High";
  }
  return "Medium";
}

function parseSummary(response: SQLExecuteResponse): DashboardSummary {
  const row = response.rows[0] ?? {};
  return {
    totalTransactions: toNumber(row.total_transactions),
    flaggedTransactions: toNumber(row.flagged_transactions),
    fraudRatePct: toNumber(row.fraud_rate_pct),
    highRiskEvents: toNumber(row.high_risk_events),
    averageProbabilityPct: toNumber(row.average_probability_pct),
    activeAlerts: toNumber(row.active_alerts),
  };
}

function parseTrend(response: SQLExecuteResponse): TrendPoint[] {
  return [...response.rows]
    .map((row) => ({
      label: toString(row.transaction_date).slice(5) || "--",
      totalTransactions: toNumber(row.total_transactions),
      fraudTransactions: toNumber(row.fraud_transactions),
    }))
    .reverse();
}

function parseBreakdown(response: SQLExecuteResponse, key: string): BreakdownPoint[] {
  return response.rows.map((row) => ({
    label: toString(row[key]) || "Unknown",
    totalTransactions: toNumber(row.total_transactions),
    fraudTransactions: toNumber(row.fraud_transactions),
  }));
}

function parseModalities(response: SQLExecuteResponse): ModalityPoint[] {
  const total = response.rows.reduce((sum, row) => sum + toNumber(row.signal_count), 0);
  return response.rows.map((row) => ({
    label: toString(row.label),
    sharePct: total > 0 ? Number(((toNumber(row.signal_count) / total) * 100).toFixed(1)) : 0,
  }));
}

function parseSuspicious(response: SQLExecuteResponse): SuspiciousTransaction[] {
  return response.rows.map((row) => ({
    transactionId: toNumber(row.transaction_id),
    transactionTimestamp: toString(row.transaction_timestamp),
    customerId: toNumber(row.customer_id),
    amount: toNumber(row.amount),
    channel: toString(row.channel),
    fraudFlag: toNumber(row.fraud_flag),
    fraudReason: toString(row.fraud_reason),
    combinedRiskScore: toNumber(row.combined_risk_score),
    originCity: toString(row.origin_city),
    destinationCity: toString(row.destination_city),
    deviceOs: toString(row.device_os),
    isNewDevice: toNumber(row.is_new_device),
    isForeignIp: toNumber(row.is_foreign_ip),
    failedLoginCount24h: toNumber(row.failed_login_count_24h),
  }));
}

function buildFallbackDashboard(): DashboardState {
  return {
    loading: false,
    error: "",
    usingFallback: true,
    summary: FALLBACK_SUMMARY,
    trend: FALLBACK_TREND,
    channels: FALLBACK_CHANNELS,
    cities: FALLBACK_CITIES,
    modalities: FALLBACK_MODALITIES,
    suspicious: FALLBACK_SUSPICIOUS,
  };
}

function metricValue(value: number | null) {
  return value == null ? "--" : value.toFixed(2);
}

function inferAssistantResponse(
  question: string,
  suspicious: SuspiciousTransaction[],
): AssistantMessage {
  const lowered = question.toLowerCase();
  const topTransactions = suspicious.slice(0, 3).map((item) => ({
    transactionId: `TXN-${item.transactionId}`,
    probability: formatProbability(item.combinedRiskScore),
    riskLevel: getRiskLevel(item.combinedRiskScore),
    status: item.fraudFlag === 1 ? "Pending" : "Monitor",
  }));

  if (lowered.includes("highest risk") || lowered.includes("top risk")) {
    return {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      text: "Here are the highest-risk transactions from the current fraud queue.",
      table: topTransactions,
    };
  }

  if (lowered.includes("why") && suspicious[0]) {
    const transaction = suspicious[0];
    return {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      text: `Transaction TXN-${transaction.transactionId} stands out because it combines ${transaction.fraudReason.toLowerCase()}, ${transaction.isNewDevice ? "new-device usage" : "known-device behavior"}, and ${transaction.isForeignIp ? "foreign network exposure" : "local network access"}.`,
      note: "Recommended action: escalate to investigation and compare against the linked customer timeline.",
    };
  }

  return {
    id: `assistant-${Date.now()}`,
    role: "assistant",
    text: "Preview mode is active, so I’m using the current fraud queue snapshot instead of a live backend answer. Try asking for high-risk transactions, channels with the highest fraud rate, or why a transaction was flagged.",
  };
}

function KpiCard({
  label,
  value,
  detail,
  barColor,
}: {
  label: string;
  value: string;
  detail: string;
  barColor: string;
}) {
  return <StatCard label={label} value={value} detail={detail} accentClassName={barColor} />;
}

function SectionTitle({
  title,
  subtitle,
  icon,
}: {
  title: string;
  subtitle: string;
  icon?: string;
}) {
  return (
    <PanelHeader
      title={title}
      subtitle={subtitle}
      icon={icon ? <AppIcon name={icon} className="h-4.5 w-4.5" /> : undefined}
    />
  );
}

function MiniStatus({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const variant = tone === "good" ? "deployed" : tone === "warn" ? "training" : "neutral";
  return (
    <Badge variant={variant} className="px-3 py-1">
      {label}: {value}
    </Badge>
  );
}

function NavigationButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <SidebarNavButton
      active={active}
      label={label}
      onClick={onClick}
      icon={<AppIcon name={icon} className="h-[17px] w-[17px]" />}
    />
  );
}

function SurfaceChip({
  icon,
  label,
  tone = "neutral",
}: {
  icon: string;
  label: string;
  tone?: "neutral" | "orange" | "indigo";
}) {
  const variant = tone === "orange" ? "high" : tone === "indigo" ? "info" : "neutral";

  return (
    <Badge
      variant={variant}
      className="gap-2 px-3 py-1.5"
      icon={
        <span className="flex h-4.5 w-4.5 items-center justify-center rounded-full bg-black/5">
          <AppIcon name={icon} className="h-3 w-3" />
        </span>
      }
    >
      {label}
    </Badge>
  );
}

export default function HomePage() {
  const [activeView, setActiveView] = useState<ViewKey>("dashboard");
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(
    FALLBACK_SUSPICIOUS[0]?.transactionId ?? null,
  );
  const [dashboard, setDashboard] = useState<DashboardState>(buildFallbackDashboard);
  const [health, setHealth] = useState<HealthState>({
    loading: true,
    usingFallback: true,
    app: null,
    db: null,
    error: "",
  });
  const [assistant, setAssistant] = useState<AssistantState>({
    sessionId: "",
    question: "",
    loading: false,
    messages: INITIAL_ASSISTANT_MESSAGES,
  });

  const activePage = navigation.find((item) => item.key === activeView) ?? navigation[0];

  const selectedTransaction =
    dashboard.suspicious.find((item) => item.transactionId === selectedTransactionId) ??
    dashboard.suspicious[0] ??
    null;

  const dominantChannel = useMemo(() => {
    const total = dashboard.channels.reduce((sum, item) => sum + item.totalTransactions, 0);
    const top = dashboard.channels[0];
    if (!top || total === 0) {
      return null;
    }
    return {
      label: top.label,
      pct: Number(((top.totalTransactions / total) * 100).toFixed(1)),
    };
  }, [dashboard.channels]);

  useEffect(() => {
    const sessionId = getOrCreateSessionId();
    setAssistant((current) => ({ ...current, sessionId }));
  }, []);

  useEffect(() => {
    void loadHealth();
    void loadDashboard();
  }, []);

  async function loadHealth() {
    setHealth((current) => ({ ...current, loading: true }));

    try {
      const [app, db] = await Promise.all([apiClient.health(), apiClient.healthDb()]);
      setHealth({
        loading: false,
        usingFallback: false,
        app,
        db,
        error: "",
      });
    } catch (error) {
      setHealth({
        loading: false,
        usingFallback: true,
        app: null,
        db: null,
        error: error instanceof Error ? error.message : "Frontend preview mode is active.",
      });
    }
  }

  async function loadDashboard() {
    setDashboard((current) => ({ ...current, loading: true }));

    try {
      const [summary, trend, channels, cities, suspicious, modalities] = await Promise.all([
        apiClient.executeSql({ sql: DASHBOARD_SQL.summary }),
        apiClient.executeSql({ sql: DASHBOARD_SQL.trend }),
        apiClient.executeSql({ sql: DASHBOARD_SQL.channels }),
        apiClient.executeSql({ sql: DASHBOARD_SQL.cities }),
        apiClient.executeSql({ sql: DASHBOARD_SQL.suspicious }),
        apiClient.executeSql({ sql: DASHBOARD_SQL.modalities }),
      ]);

      const suspiciousRows = parseSuspicious(suspicious);
      setDashboard({
        loading: false,
        error: "",
        usingFallback: false,
        summary: parseSummary(summary),
        trend: parseTrend(trend),
        channels: parseBreakdown(channels, "channel"),
        cities: parseBreakdown(cities, "origin_city"),
        suspicious: suspiciousRows,
        modalities: parseModalities(modalities),
      });
      setSelectedTransactionId((current) => current ?? suspiciousRows[0]?.transactionId ?? null);
    } catch (error) {
      const fallback = buildFallbackDashboard();
      setDashboard({
        ...fallback,
        error:
          error instanceof Error
            ? error.message
            : "Preview mode is using fallback dashboard data.",
      });
    }
  }

  async function submitAssistantQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed) {
      return;
    }

    const userMessage: AssistantMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
    };

    setAssistant((current) => ({
      ...current,
      question: "",
      loading: true,
      messages: [...current.messages, userMessage],
    }));

    try {
      const sessionId = assistant.sessionId || getOrCreateSessionId();
      const response = await apiClient.chatQuery({
        question: trimmed,
        session_id: sessionId,
      });

      const backendMessage: AssistantMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        text: response.answer,
        table:
          response.rows.length > 0
            ? response.rows.slice(0, 3).map((row) => ({
                transactionId: toString(
                  row.transaction_id ?? row.transactionId ?? row.id ?? "Result",
                ),
                probability:
                  row.fraud_probability != null
                    ? `${toNumber(row.fraud_probability).toFixed(2)}`
                    : "Live result",
                riskLevel: "high",
                status: "Returned",
              }))
            : undefined,
      };

      setAssistant((current) => ({
        ...current,
        sessionId,
        loading: false,
        messages: [...current.messages, backendMessage],
      }));
    } catch {
      const fallbackMessage = inferAssistantResponse(trimmed, dashboard.suspicious);
      setAssistant((current) => ({
        ...current,
        loading: false,
        messages: [...current.messages, fallbackMessage],
      }));
    }
  }

  function openSelectedTransactionInAssistant() {
    if (!selectedTransaction) {
      return;
    }
    setActiveView("assistant");
    setAssistant((current) => ({
      ...current,
      question: `Why was transaction TXN-${selectedTransaction.transactionId} for customer ${selectedTransaction.customerId} flagged as suspicious?`,
    }));
  }

  function resetAssistantConversation() {
    setAssistant({
      sessionId: createNewSessionId(),
      question: "",
      loading: false,
      messages: INITIAL_ASSISTANT_MESSAGES,
    });
  }

  const trendMax = Math.max(...dashboard.trend.map((item) => item.fraudTransactions), 1);
  const requestVolumeBars = dashboard.trend.length > 0 ? dashboard.trend : FALLBACK_TREND;

  return (
    <div className="app-shell text-[var(--color-ink-strong)]">
      <aside className="fixed left-0 top-0 z-50 flex h-full w-[var(--shell-sidebar-w)] flex-col overflow-hidden bg-[#08004D] py-6 shadow-2xl">
        <div className="px-5">
          <div className="rounded-[26px] border border-white/10 bg-white/[0.04] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="relative h-9 w-[188px]">
              <Image
                src="/Cloudera_logo.svg.png"
                alt="Cloudera Fraud AI Intelligence"
                fill
                className="object-contain object-left"
                sizes="188px"
                priority
              />
            </div>
            <p className="meta-kicker mt-4 text-[#8f91ff]">
              Fraud AI Intelligence
            </p>
          </div>
        </div>

        <nav className="mt-10 flex-1 space-y-1">
          {navigation.map((item) => (
            <NavigationButton
              key={item.key}
              active={item.key === activeView}
              icon={item.icon}
              label={item.label}
              onClick={() => setActiveView(item.key)}
            />
          ))}
        </nav>

        <div className="mt-auto px-2">
          <NavigationButton
            active={false}
            icon="settings"
            label="Settings"
            onClick={() => undefined}
          />
        </div>
      </aside>

      <header className="fixed left-[var(--shell-sidebar-w)] right-0 top-0 z-40 flex h-[var(--shell-header-h)] items-center justify-between border-b-2 border-[#5F67F6] bg-white px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="meta-kicker text-[#474650]">
            Fraud AI Intelligence
          </span>
          <span className="h-4 w-px bg-[#c8c5d2]" />
          <span className="meta-kicker text-[#191c1f]">
            Latest update {new Date().toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            className="rounded-full px-2 py-1 text-[#1F2430] hover:bg-[#f2f3f7] hover:text-[#5F67F6]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f3f7] text-[#5F67F6]">
              <AppIcon name="group" className="h-4 w-4" />
            </span>
            <span className="meta-kicker text-[#1f2430]">Users</span>
          </Button>
          <div className="numeric flex h-8 w-8 items-center justify-center rounded-full bg-[#edeef2] text-[13px] font-semibold text-[#08004D]">
            TD
          </div>
        </div>
      </header>

      <main className="ml-[var(--shell-sidebar-w)] min-h-screen bg-[var(--color-page-bg)] pt-[var(--shell-header-h)]">
        <PageCanvas className="space-y-8">
          <PageHeaderBlock>
            <h1 className="page-title">
              {activePage.title}
            </h1>
            <p className="page-subtitle">{activePage.subtitle}</p>
          </PageHeaderBlock>

          {activeView === "dashboard" ? (
            <PageSection>
              <FilterBar className="lg:items-end">
                <FilterGroup>
                  {["Last 24 Hours", "All Channels", "Risk: All Levels"].map((item) => (
                    <div
                      key={item}
                      className="rounded-[14px] border border-[var(--color-border-soft)] bg-[var(--color-surface)] px-4 py-2.5 text-[var(--font-size-filter)] font-semibold tracking-[0.01em] text-[var(--color-ink-strong)]"
                    >
                      {item}
                    </div>
                  ))}
                  <Button
                    variant="primary"
                    size="md"
                    leadingIcon={<AppIcon name="filter_list" className="h-3.5 w-3.5" />}
                  >
                    Apply
                  </Button>
                </FilterGroup>
                <div className="flex flex-wrap items-center gap-2">
                  <MiniStatus
                    label="Mode"
                    value={dashboard.usingFallback ? "Preview" : "Live"}
                    tone={dashboard.usingFallback ? "warn" : "good"}
                  />
                  <MiniStatus
                    label="Backend"
                    value={health.usingFallback ? "Offline" : "Connected"}
                    tone={health.usingFallback ? "warn" : "good"}
                  />
                </div>
              </FilterBar>

              <MetricGrid>
                <KpiCard
                  label="Total Transactions"
                  value={formatInteger(dashboard.summary.totalTransactions)}
                  detail={dashboard.usingFallback ? "Preview" : "Live"}
                  barColor="bg-[#7174fa]"
                />
                <KpiCard
                  label="Flagged Trans."
                  value={formatInteger(dashboard.summary.flaggedTransactions)}
                  detail="Escalated"
                  barColor="bg-[#ff7a2f]"
                />
                <KpiCard
                  label="Fraud Rate"
                  value={formatPercent(dashboard.summary.fraudRatePct)}
                  detail="Current"
                  barColor="bg-[#a04100]"
                />
                <KpiCard
                  label="High Risk Events"
                  value={formatInteger(dashboard.summary.highRiskEvents)}
                  detail="Score > 0.80"
                  barColor="bg-[#ba1a1a]"
                />
                <KpiCard
                  label="Avg Probability"
                  value={`${dashboard.summary.averageProbabilityPct.toFixed(0)}%`}
                  detail="Stable"
                  barColor="bg-[#07006c]"
                />
                <KpiCard
                  label="Active Alerts"
                  value={formatInteger(dashboard.summary.activeAlerts)}
                  detail={`New: ${Math.min(dashboard.summary.activeAlerts, 12)}`}
                  barColor="bg-[#ff7a2f]"
                />
              </MetricGrid>

              <div className="grid grid-cols-12 gap-5 xl:gap-6">
                <PanelCard className="col-span-12 overflow-hidden p-8 lg:col-span-8">
                  <div className="mb-8 flex items-center justify-between gap-4">
                    <SectionTitle
                      title="Fraud Signal Velocity"
                      subtitle="Intelligent scoring timeline"
                      icon="monitoring"
                    />
                    <div className="flex gap-4">
                      <span className="meta-label flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#ff7a2f]" />
                        Alerts
                      </span>
                      <span className="meta-label flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#7174fa]" />
                        Volume
                      </span>
                    </div>
                  </div>
                  <div className="relative flex h-64 items-end gap-2 px-4">
                    <div className="absolute inset-0 flex flex-col justify-between opacity-10">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <div key={index} className="h-px border-t border-[#191c1f]" />
                      ))}
                    </div>
                    {dashboard.trend.map((point, index) => (
                      <div key={`${point.label}-${index}`} className="flex flex-1 items-end gap-1">
                        <div
                          className="w-1/2 rounded-t-sm bg-[#7174fa]/20"
                          style={{
                            height: `${Math.max((point.totalTransactions / Math.max(...dashboard.trend.map((item) => item.totalTransactions), 1)) * 100, 18)}%`,
                          }}
                        />
                        <div
                          className="w-1/2 rounded-t-sm bg-[#ff7a2f]"
                          style={{
                            height: `${Math.max((point.fraudTransactions / trendMax) * 100, 14)}%`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex justify-between px-4 text-[var(--font-size-meta)] font-semibold tracking-[0.04em] text-[#777681]">
                    {dashboard.trend.map((point) => (
                      <span key={point.label}>{point.label}</span>
                    ))}
                  </div>
                </PanelCard>

                <PanelCard className="col-span-12 flex flex-col justify-between p-8 lg:col-span-4">
                  <SectionTitle
                    title="Channel Surface"
                    subtitle="Exposure by medium"
                    icon="donut_large"
                  />
                  <div className="py-6">
                    <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full border-[16px] border-[#edeef2]">
                      <div
                        className="absolute inset-[-16px] rounded-full border-[16px] border-[#ff7a2f]"
                        style={{
                          clipPath:
                            "polygon(50% 50%, 50% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 60%)",
                        }}
                      />
                      <div className="text-center">
                        <span className="metric-value block text-[var(--color-ink-strong)]">
                          {dominantChannel ? `${dominantChannel.pct.toFixed(0)}%` : "--"}
                        </span>
                        <span className="section-subtitle block text-[11px]">
                          {dominantChannel ? `${dominantChannel.label} Dominated` : "Awaiting data"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {dashboard.channels.map((item, index) => {
                      const colors = ["bg-[#ff7a2f]", "bg-[#7174fa]", "bg-[#c8c5d2]", "bg-[#e1e2e6]"];
                      const total = dashboard.channels.reduce(
                        (sum, channel) => sum + channel.totalTransactions,
                        0,
                      );
                      const pct = total > 0 ? (item.totalTransactions / total) * 100 : 0;
                      return (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${colors[index % colors.length]}`} />
                          <div>
                            <p className="meta-label">
                              {item.label}
                            </p>
                            <p className="body-strong numeric">{pct.toFixed(1)}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </PanelCard>

                <PanelCard className="col-span-12 p-8 lg:col-span-4">
                  <SectionTitle
                    title="Risk Modalities"
                    subtitle="Primary drivers"
                    icon="neurology"
                  />
                  <div className="mt-8 space-y-6">
                    {dashboard.modalities.map((item) => (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between text-[13px] font-semibold tracking-[0.01em]">
                          <span>{item.label}</span>
                          <span className="text-[#ff7a2f]">{item.sharePct.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#edeef2]">
                          <div
                            className="h-full rounded-full bg-[#ff7a2f]"
                            style={{ width: `${item.sharePct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </PanelCard>

                <PanelCard className="col-span-12 overflow-hidden lg:col-span-8 lg:flex">
                  <div className="w-full p-8 lg:w-1/3">
                    <SectionTitle
                      title="Regional Risk"
                      subtitle="High-density zones"
                      icon="public"
                    />
                    <ul className="mt-8 space-y-4">
                      {dashboard.cities.slice(0, 3).map((item, index) => {
                        const colors = ["bg-[#ba1a1a]", "bg-[#ff7a2f]", "bg-[#7e7cc5]"];
                        return (
                          <li key={item.label} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`h-2 w-2 rounded-full ${colors[index % colors.length]}`} />
                              <span className="text-sm font-semibold">{item.label}</span>
                            </div>
                            <span className="numeric text-[13px] font-semibold text-[#777681]">
                              {item.totalTransactions > 0
                                ? formatPercent(
                                    (item.fraudTransactions / item.totalTransactions) * 100,
                                  )
                                : "0.00%"}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="relative min-h-[320px] flex-1 overflow-hidden bg-[linear-gradient(180deg,#53585f_0%,#646a71_100%)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(255,122,47,0.24),transparent_12%),radial-gradient(circle_at_58%_55%,rgba(255,122,47,0.22),transparent_14%),radial-gradient(circle_at_75%_24%,rgba(186,26,26,0.28),transparent_10%),radial-gradient(circle_at_80%_68%,rgba(255,214,170,0.16),transparent_20%)]" />
                    <div className="absolute left-[22%] top-[26%] h-4 w-4 animate-pulse rounded-full bg-[#ba1a1a]" />
                    <div className="absolute left-[56%] top-[52%] h-3 w-3 animate-pulse rounded-full bg-[#ff7a2f]" />
                    <div className="absolute right-[24%] top-[24%] h-5 w-5 animate-pulse rounded-full bg-[#ba1a1a]/80" />
                  </div>
                </PanelCard>

                <PanelCard tone="indigo" className="col-span-12 flex flex-col justify-between p-8 lg:col-span-4">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-headline text-xl font-bold">Sentinel Force</h3>
                        <p className="section-subtitle mt-1 text-white/60">
                          Live team capacity
                        </p>
                      </div>
                      <AppIcon name="groups" className="h-5 w-5 text-white/70" />
                    </div>
                  </div>
                  <div className="my-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Open Alerts</span>
                      <span className="metric-value text-white">
                        {formatInteger(dashboard.summary.activeAlerts)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Team Load</span>
                      <Badge variant="high" className="rounded-md px-2 py-0.5">
                        Heavy
                      </Badge>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-full w-[88%] rounded-full bg-[#ff7a2f]" />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full"
                    trailingIcon={<AppIcon name="arrow_forward" className="h-[14px] w-[14px]" />}
                  >
                    Adjust Routing
                  </Button>
                </PanelCard>

                <TableCard className="col-span-12 lg:col-span-8">
                  <div className="flex items-center justify-between border-b border-[#f2f3f7] px-8 py-6">
                    <div className="flex items-center gap-3">
                      <AppIcon name="crisis_alert" className="h-5 w-5 text-[#4a4cd2]" />
                      <h3 className="font-headline text-xl font-bold text-[#191c1f]">
                        Critical Intelligence Log
                      </h3>
                    </div>
                    <Button
                      type="button"
                      variant="tertiary"
                      size="sm"
                      className="px-0 text-[var(--color-action-primary)]"
                      onClick={() => setActiveView("investigations")}
                    >
                      View All Records
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <DataTable>
                      <thead>
                        <tr>
                          {["TX ID", "Amount", "Risk Level", "Probability", "Scored At"].map((label) => (
                            <TableHeadCell key={label} numeric={label === "Scored At"}>
                              {label}
                            </TableHeadCell>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f2f3f7]">
                        {dashboard.suspicious.map((item) => {
                          const riskLevel = getRiskLevel(item.combinedRiskScore);
                          return (
                            <tr
                              key={item.transactionId}
                              className="cursor-pointer transition-colors hover:bg-[#f2f3f7]/50"
                              onClick={() => {
                                setSelectedTransactionId(item.transactionId);
                                setActiveView("investigations");
                              }}
                            >
                              <TableCell>
                                <p className="body-strong">#TX-{item.transactionId}</p>
                                <p className="table-meta">
                                  CUST_{item.customerId}
                                </p>
                              </TableCell>
                              <TableCell className="text-sm font-bold">
                                {formatCurrency(item.amount)}
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={riskLevel}
                                  className="rounded-md px-2.5 py-1"
                                  icon={
                                    riskLevel === "critical" ? (
                                      <AppIcon name="priority_high" className="h-[10px] w-[10px]" />
                                    ) : undefined
                                  }
                                >
                                  {getRiskLabel(riskLevel)}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm font-bold text-[#ff7a2f]">
                                {formatProbability(item.combinedRiskScore)}
                              </TableCell>
                              <TableCell numeric className="table-meta">
                                {item.transactionTimestamp.slice(11, 19)}
                              </TableCell>
                            </tr>
                          );
                        })}
                      </tbody>
                    </DataTable>
                  </div>
                </TableCard>
              </div>
            </PageSection>
          ) : null}

          {activeView === "investigations" ? (
            <PageSection>
              <div className="grid grid-cols-12 gap-5 xl:gap-6">
                <PanelCard className="col-span-12 p-6 lg:col-span-8">
                  <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <SectionTitle
                      title="Investigations Queue"
                      subtitle="Review suspicious transactions, linked entities, and case status"
                      icon="policy"
                    />
                    <div className="flex gap-3">
                      <Button type="button" variant="secondary" size="md">
                        Export CSV
                      </Button>
                      <Button type="button" variant="primary" size="md">
                        Filter Results
                      </Button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <DataTable>
                      <thead>
                        <tr>
                          {["Case ID", "Transaction", "Risk Level", "Probability", "Status", "Action"].map((item) => (
                            <TableHeadCell key={item} className="px-4 py-3">
                              {item}
                            </TableHeadCell>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#f2f3f7]">
                        {dashboard.suspicious.slice(0, 4).map((item) => {
                          const riskLevel = getRiskLevel(item.combinedRiskScore);
                          const isSelected = item.transactionId === selectedTransaction?.transactionId;
                          return (
                            <tr
                              key={item.transactionId}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? "bg-[#f2f3f7]/70" : "hover:bg-[#f2f3f7]/40"
                              }`}
                              onClick={() => setSelectedTransactionId(item.transactionId)}
                            >
                              <TableCell className="px-4 py-4">
                                <p className="text-[13px] font-semibold text-[#08004D]">
                                  #FR-{item.customerId}
                                </p>
                                <p className="table-meta">Open case</p>
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm font-semibold">
                                TXN-{item.transactionId}
                              </TableCell>
                              <TableCell className="px-4 py-4">
                                <Badge variant={riskLevel} className="rounded-md px-2.5 py-1">
                                  {getRiskLabel(riskLevel)}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-4 py-4 text-sm font-bold text-[#ff7a2f]">
                                {formatProbability(item.combinedRiskScore)}
                              </TableCell>
                              <TableCell className="px-4 py-4">
                                <Badge variant={item.fraudFlag === 1 ? "open" : "pending"}>
                                  {item.fraudFlag === 1 ? "Open" : "Pending"}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-4 py-4">
                                <Button type="button" variant="secondary" size="sm">
                                  Review
                                </Button>
                              </TableCell>
                            </tr>
                          );
                        })}
                      </tbody>
                    </DataTable>
                  </div>
                </PanelCard>

                <PanelCard className="col-span-12 p-6 lg:col-span-4">
                  <div className="mb-7 flex items-start justify-between gap-4">
                    <div>
                      <p className="meta-label">
                        Case Profile
                      </p>
                      <h3 className="mt-1 font-headline text-[26px] font-bold tracking-[-0.03em] text-[#08004D]">
                        #FR-{selectedTransaction?.customerId ?? "----"}
                      </h3>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      className="h-10 w-10 px-0"
                      aria-label="Share case"
                    >
                      <AppIcon name="share" className="h-4.5 w-4.5" />
                    </Button>
                  </div>

                  {selectedTransaction ? (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <SurfaceChip
                          icon="warning"
                          label={`Risk ${getRiskLabel(
                            getRiskLevel(selectedTransaction.combinedRiskScore),
                          )}`}
                          tone="orange"
                        />
                        <SurfaceChip icon="smartphone" label="New device" tone="neutral" />
                        <SurfaceChip icon="bolt" label="Velocity spike" tone="indigo" />
                      </div>

                      <div className="mt-5 rounded-lg bg-[#f2f3f7] p-4">
                        <p className="meta-label">
                          Account Profile
                        </p>
                        <div className="mt-4 flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-sm font-bold text-[#08004D]">
                            {String(selectedTransaction.customerId).slice(-2)}
                          </div>
                          <div>
                            <p className="body-strong">
                              Customer {selectedTransaction.customerId}
                            </p>
                            <p className="table-meta">
                              {selectedTransaction.originCity} • {selectedTransaction.channel} • {selectedTransaction.deviceOs}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 space-y-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#777681]">Transaction Value</span>
                          <span className="font-bold text-[#ba1a1a]">
                            {formatCurrency(selectedTransaction.amount)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#777681]">Probability</span>
                          <span className="font-bold text-[#191c1f]">
                            {formatProbability(selectedTransaction.combinedRiskScore)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#777681]">Destination</span>
                          <span className="font-bold text-[#191c1f]">
                            {selectedTransaction.destinationCity || "Unknown"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-6 grid grid-cols-2 gap-3">
                        <Button type="button" variant="secondary" size="lg" className="bg-[#08004D] text-white hover:bg-[#12006f]">
                          Freeze Account
                        </Button>
                        <Button type="button" variant="destructive" size="lg" className="bg-[#ffdad6] text-[#93000a] shadow-none hover:bg-[#ffc8c1] active:bg-[#ffb4ab]">
                          Escalate Case
                        </Button>
                      </div>
                    </>
                  ) : null}
                </PanelCard>

                <PanelCard className="col-span-12 p-6 lg:col-span-6">
                  <SectionTitle title="Entity Graph" subtitle="Linked signals" icon="hub" />
                  <div className="mt-6 flex min-h-[260px] items-center justify-center rounded-xl bg-[radial-gradient(circle_at_center,rgba(113,116,250,0.08),transparent_58%),#f8f9fd]">
                    <div className="grid grid-cols-3 gap-6">
                      {[
                        { icon: "smartphone", color: "bg-[#5C63F2]" },
                        { icon: "account_balance", color: "bg-[#ff7a2f]" },
                        { icon: "shield", color: "bg-[#ba1a1a]" },
                      ].map((node) => (
                        <div
                          key={node.icon}
                          className={`flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg ${node.color}`}
                        >
                          <AppIcon name={node.icon} className="h-[18px] w-[18px]" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="table-meta mt-4">
                    Linked signals: device reuse, beneficiary change, and network context for the active case.
                  </p>
                </PanelCard>

                <div className="col-span-12 space-y-6 lg:col-span-6">
                  <PanelCard className="p-6">
                    <SectionTitle
                      title="Transaction Timeline"
                      subtitle="Event sequence"
                      icon="timeline"
                    />
                    <div className="mt-6 space-y-6">
                      {selectedTransaction
                        ? [
                            {
                              tone: "bg-[#ba1a1a]",
                              title: "High-risk transaction scored",
                              detail: `TXN-${selectedTransaction.transactionId} reached ${formatProbability(selectedTransaction.combinedRiskScore)} probability.`,
                            },
                            {
                              tone: "bg-[#ff7a2f]",
                              title: selectedTransaction.isNewDevice ? "New device login detected" : "Known device reused",
                              detail: `${selectedTransaction.deviceOs} observed from ${selectedTransaction.originCity}.`,
                            },
                            {
                              tone: "bg-[#d9dade]",
                              title: "Account activity context",
                              detail: `${selectedTransaction.failedLoginCount24h} failed logins in the last 24h.`,
                            },
                          ].map((event) => (
                            <div key={event.title} className="flex gap-3">
                              <div className={`mt-1 h-2.5 w-2.5 rounded-full ${event.tone}`} />
                              <div>
                                <p className="body-strong">{event.title}</p>
                                <p className="table-meta mt-1">{event.detail}</p>
                              </div>
                            </div>
                          ))
                        : null}
                    </div>
                  </PanelCard>

                  <PanelCard className="p-6">
                    <SectionTitle
                      title="Analyst Intelligence Notes"
                      subtitle="Internal directives"
                      icon="edit_note"
                    />
                    <div className="body-copy mt-6 rounded-xl bg-[#f2f3f7] p-4">
                      Add analyst observations here. Use this panel to capture escalation notes, model concerns, or next-step instructions for the current case.
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="meta-label">
                        Sarah Johnson mentioned this case in #fraud-ops-general
                      </p>
                      <Button type="button" variant="secondary" size="md" className="bg-[#08004D] text-white hover:bg-[#12006f]">
                        Save Note
                      </Button>
                    </div>
                  </PanelCard>
                </div>
              </div>
            </PageSection>
          ) : null}

          {activeView === "assistant" ? (
            <PageSection>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
                <PanelCard className="p-6">
                  <p className="meta-label">
                    Now
                  </p>
                  <h3 className="mt-3 font-headline text-[var(--font-size-card-title)] font-[var(--font-weight-card-title)] tracking-[-0.02em] text-[#191c1f]">
                    Work from `fraud_transactions`
                  </h3>
                  <p className="body-copy mt-2">
                    The copilot should answer from suspicious transactions, fraud signals, velocity spikes, device risk, and geography first.
                  </p>
                </PanelCard>
                <PanelCard className="p-6">
                  <p className="meta-label">
                    Next
                  </p>
                  <h3 className="mt-3 font-headline text-[var(--font-size-card-title)] font-[var(--font-weight-card-title)] tracking-[-0.02em] text-[#191c1f]">
                    Add investigation context
                  </h3>
                  <p className="body-copy mt-2">
                    Layer in `investigation_cases` so the assistant can explain case status, ownership, escalation, and analyst actions.
                  </p>
                </PanelCard>
                <PanelCard className="p-6">
                  <p className="meta-label">
                    Later
                  </p>
                  <h3 className="mt-3 font-headline text-[var(--font-size-card-title)] font-[var(--font-weight-card-title)] tracking-[-0.02em] text-[#191c1f]">
                    Add model + auth telemetry
                  </h3>
                  <p className="body-copy mt-2">
                    Bring in `model_inference_log` and `auth_events` so the workspace can connect predictions to real business outcomes and account-takeover stories.
                  </p>
                </PanelCard>
              </div>

              <div className="grid grid-cols-12 gap-5 xl:gap-6">
              <PanelCard className="col-span-12 flex min-h-[760px] flex-col overflow-hidden lg:col-span-8">
                <div className="h-1 w-full bg-[linear-gradient(135deg,#a04100_0%,#ff7a2f_100%)]" />
                <div className="border-b border-[#f2f3f7] px-8 py-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <SurfaceChip icon="smart_toy" label="Fraud copilot live" tone="indigo" />
                    <SurfaceChip icon="dashboard" label="Source fraud_transactions" tone="neutral" />
                    <SurfaceChip
                      icon="policy"
                      label={
                        selectedTransaction
                          ? `Case TXN-${selectedTransaction.transactionId}`
                          : "Case context pending"
                      }
                      tone="orange"
                    />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto px-8 py-8">
                  <div className="space-y-8">
                    {assistant.messages.map((message) =>
                      message.role === "user" ? (
                        <div key={message.id} className="flex justify-end">
                          <div className="max-w-[80%] rounded-2xl rounded-tr-none bg-[#e7e8ec] px-5 py-3">
                            <p className="text-sm text-[#191c1f]">{message.text}</p>
                          </div>
                        </div>
                      ) : (
                        <div key={message.id} className="flex items-start gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#a04100_0%,#ff7a2f_100%)] text-white">
                            <AppIcon name="smart_toy" className="h-4 w-4" />
                          </div>
                          <div className="max-w-[92%] flex-1 rounded-2xl rounded-tl-none border border-[#c8c5d2]/20 bg-[#f2f3f7] px-6 py-5">
                            <p className="meta-label">
                              Assistant
                            </p>
                            <p className="mt-3 text-[15px] leading-[1.72] text-[#191c1f]">{message.text}</p>
                            {message.note ? (
                              <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#ffdad6]/60 p-3">
                                <AppIcon name="report" className="h-4 w-4 text-[#ba1a1a]" />
                                <span className="text-[13px] font-semibold leading-[1.5] text-[#93000a]">
                                  {message.note}
                                </span>
                              </div>
                            ) : null}
                            {message.table ? (
                              <div className="mt-5 overflow-hidden rounded-lg bg-white">
                                <DataTable className="text-left text-xs">
                                  <thead>
                                    <tr>
                                      {["Transaction ID", "Probability", "Risk Level", "Status"].map((label) => (
                                        <TableHeadCell key={label} className="px-4 py-3">
                                          {label}
                                        </TableHeadCell>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#f2f3f7]">
                                    {message.table.map((row) => (
                                      <tr key={row.transactionId}>
                                        <TableCell className="px-4 py-3 font-medium">{row.transactionId}</TableCell>
                                        <TableCell className="px-4 py-3 font-bold text-[#ff7a2f]">
                                          {row.probability}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                          <Badge variant={row.riskLevel} className="rounded-md px-2.5 py-1">
                                            {getRiskLabel(row.riskLevel)}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="px-4 py-3">{row.status}</TableCell>
                                      </tr>
                                    ))}
                                  </tbody>
                                </DataTable>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>

                <div className="border-t border-[#f2f3f7] px-8 py-6">
                  <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                    {[
                      {
                        title: "Inquiry",
                        body: "Ask the Sentinel about fraud intelligence, suspicious cases, or top risk pockets.",
                      },
                      {
                        title: "Analysis",
                        body: "Summarize fraud activity by channel, city, or recent high-risk transaction clusters.",
                      },
                      {
                        title: "Next Steps",
                        body: "Pivot into Investigations when you want case-level review and analyst actions.",
                      },
                    ].map((card) => (
                      <div key={card.title} className="rounded-lg bg-[#f2f3f7] p-4">
                        <p className="meta-label">
                          {card.title}
                        </p>
                        <p className="body-copy mt-2 text-[#191c1f]">{card.body}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 rounded-[18px] bg-[var(--color-surface-muted)] px-4 py-3">
                    <TextInput
                      value={assistant.question}
                      onChange={(event) =>
                        setAssistant((current) => ({
                          ...current,
                          question: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          void submitAssistantQuestion(assistant.question);
                        }
                      }}
                      placeholder="Ask the Sentinel about fraud intelligence..."
                      className="h-auto flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                    />
                    <Button
                      type="button"
                      onClick={() => void submitAssistantQuestion(assistant.question)}
                      variant="primary"
                      size="md"
                      className="h-10 w-10 px-0"
                    >
                      <AppIcon name="send" className="h-4.5 w-4.5" />
                    </Button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button type="button" variant="secondary" size="md" className="bg-[#08004D] text-white hover:bg-[#12006f]" onClick={openSelectedTransactionInAssistant}>
                      Use Selected Case
                    </Button>
                    <Button type="button" variant="secondary" size="md" onClick={resetAssistantConversation}>
                      Reset Session
                    </Button>
                  </div>
                </div>
              </PanelCard>

              <StickyRail className="col-span-12 lg:col-span-4 lg:sticky lg:top-24 lg:self-start">
                <PanelCard className="p-6">
                  <SectionTitle
                    title="Real-Time Context"
                    subtitle="Current signal state"
                    icon="monitoring"
                  />
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="meta-label">
                        Total Transactions
                      </span>
                      <span className="font-headline numeric text-[32px] font-bold tracking-[-0.03em] text-[#191c1f]">
                        {formatInteger(dashboard.summary.totalTransactions)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="meta-label">
                        Flagged
                      </span>
                      <span className="font-headline numeric text-[32px] font-bold tracking-[-0.03em] text-[#ba1a1a]">
                        {formatInteger(dashboard.summary.flaggedTransactions)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="meta-label">
                        Highest Count
                      </span>
                      <span className="font-headline numeric text-[32px] font-bold tracking-[-0.03em] text-[#ff7a2f]">
                        {formatInteger(dashboard.summary.highRiskEvents)}
                      </span>
                    </div>
                    <div className="rounded-lg bg-[#f2f3f7] p-4">
                      <p className="meta-label">
                        Model Performance
                      </p>
                      <p className="body-strong mt-2">
                        {dashboard.summary.averageProbabilityPct.toFixed(1)}% average probability
                      </p>
                      <p className="table-meta mt-1">
                        Current model: {modelManagement.activeModel}
                      </p>
                    </div>
                    <div className="rounded-lg bg-[#f2f3f7] p-4">
                      <p className="meta-label">
                        Action Model
                      </p>
                      <p className="body-copy mt-2 text-[#191c1f]">
                        Sentinel-v1 recommends moving the most critical cases into Investigations for analyst confirmation.
                      </p>
                    </div>
                    <div className="rounded-lg bg-[#f2f3f7] p-4">
                      <p className="meta-label">
                        Recent Context
                      </p>
                      <p className="body-copy mt-2 text-[#191c1f]">
                        {selectedTransaction
                          ? `Customer ${selectedTransaction.customerId} from ${selectedTransaction.originCity} is the active case in view.`
                          : "No case selected."}
                      </p>
                    </div>
                  </div>
                </PanelCard>

                <PanelCard tone="dark" className="p-6">
                  <p className="section-subtitle text-white/60">
                    System Status
                  </p>
                  <h3 className="mt-2 font-headline text-[32px] font-bold tracking-[-0.03em]">
                    Security Core {health.usingFallback ? "Preview" : "Active"}
                  </h3>
                  <p className="mt-3 text-[15px] leading-[1.65] text-white/80">
                    {health.usingFallback
                      ? "Frontend preview mode is active while the backend is offline."
                      : "The fraud assistant backend is connected and ready for live SQL-backed answers."}
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <Button type="button" variant="ghost" size="md">
                      View Log
                    </Button>
                    <AppIcon name="shield" className="h-5 w-5 text-[#ff7a2f]" />
                  </div>
                </PanelCard>

                <PanelCard className="p-6">
                  <SectionTitle
                    title="Scenario Data Plan"
                    subtitle="Ralph Wiggum method"
                    icon="timeline"
                  />
                  <div className="mt-6 space-y-4 text-sm text-[#5d5b66]">
                    <div className="rounded-xl bg-[#f2f3f7] p-4">
                      <p className="meta-label">
                        Step 1
                      </p>
                      <p className="mt-2 font-semibold text-[#191c1f]">Big scary numbers first.</p>
                      <p className="mt-1">Use `fraud_transactions` for volume, flags, risk score, city, channel, and suspicious queue.</p>
                    </div>
                    <div className="rounded-xl bg-[#f2f3f7] p-4">
                      <p className="meta-label">
                        Step 2
                      </p>
                      <p className="mt-2 font-semibold text-[#191c1f]">Then make cases feel real.</p>
                      <p className="mt-1">Add `investigation_cases` so the dashboard and assistant can talk about review status, assignee, and escalation.</p>
                    </div>
                    <div className="rounded-xl bg-[#f2f3f7] p-4">
                      <p className="meta-label">
                        Step 3
                      </p>
                      <p className="mt-2 font-semibold text-[#191c1f]">Then make the story smarter.</p>
                      <p className="mt-1">Add `model_inference_log` and `auth_events` for explainability, deployment trust, and account-takeover context.</p>
                    </div>
                  </div>
                </PanelCard>
              </StickyRail>
              </div>
            </PageSection>
          ) : null}

          {activeView === "models" ? (
            <PageSection>
              <FilterBar className="lg:items-center">
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    leadingIcon={<AppIcon name="refresh" className="h-3.5 w-3.5" />}
                  >
                    Rollback
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    className="bg-[#08004D] text-white hover:bg-[#12006f]"
                    leadingIcon={<AppIcon name="rocket_launch" className="h-3.5 w-3.5" />}
                  >
                    Deploy Version
                  </Button>
                </div>
                <MiniStatus
                  label="Contract"
                  value="predictions[]"
                  tone="good"
                />
              </FilterBar>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <KpiCard
                  label="Active Model"
                  value={modelManagement.activeModel}
                  detail="Champion"
                  barColor="bg-[#07006c]"
                />
                <KpiCard
                  label="Model Version"
                  value={modelManagement.version}
                  detail="Packaged"
                  barColor="bg-[#7174fa]"
                />
                <KpiCard
                  label="Status"
                  value={modelManagement.status}
                  detail={health.usingFallback ? "Preview" : "Live"}
                  barColor="bg-[#ff7a2f]"
                />
                <KpiCard
                  label="Health"
                  value={modelManagement.health}
                  detail="Ready"
                  barColor="bg-[#ff7a2f]"
                />
                <KpiCard
                  label="Last Trained"
                  value="Latest"
                  detail={modelManagement.lastTrained}
                  barColor="bg-[#07006c]"
                />
              </div>

              <div className="grid grid-cols-12 gap-5 xl:gap-6">
                <PanelCard className="col-span-12 p-8 lg:col-span-8">
                  <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
                    <SectionTitle
                      title="Model Performance"
                      subtitle="Real-time inference and accuracy metrics"
                      icon="query_stats"
                    />
                    <MiniStatus
                      label="Inference latency"
                      value="~14ms"
                      tone="warn"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
                    {[
                      { label: "Precision", value: modelManagement.metrics.precision },
                      { label: "Recall", value: modelManagement.metrics.recall },
                      { label: "F1 Score", value: modelManagement.metrics.f1 },
                      { label: "ROC AUC", value: modelManagement.metrics.rocAuc },
                    ].map((metric, index) => (
                      <div key={metric.label} className="space-y-2">
                        <p className="meta-label">
                          {metric.label}
                        </p>
                        <p className="metric-value text-[44px] text-[#191c1f]">
                          {metricValue(metric.value)}
                        </p>
                        <div className="h-1 rounded-full bg-[#f2f3f7]">
                          <div
                            className={`h-full rounded-full ${
                              index === 3 ? "bg-[#ff7a2f]" : "bg-[#07006c]"
                            }`}
                            style={{ width: metric.value == null ? "22%" : `${metric.value * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-12 rounded-2xl bg-[#f2f3f7] p-6">
                    <div className="mb-6 flex items-center justify-between">
                      <span className="meta-label">
                        Request Volume
                      </span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[12px] font-semibold text-emerald-600">
                        +4.2% from latest sample
                      </span>
                    </div>
                    <div className="flex h-32 items-end gap-1.5">
                      {requestVolumeBars.map((item, index) => (
                        <div
                          key={`${item.label}-${index}`}
                          className={`w-full rounded-t ${
                            index >= requestVolumeBars.length - 2 ? "bg-[#ff7a2f]" : "bg-[#07006c]/20"
                          }`}
                          style={{
                            height: `${Math.max(
                              (item.totalTransactions /
                                Math.max(...requestVolumeBars.map((point) => point.totalTransactions), 1)) *
                                100,
                              18,
                            )}%`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </PanelCard>

                <StickyRail className="col-span-12 lg:col-span-4">
                  <PanelCard className="p-6">
                    <h3 className="flex items-center gap-2 font-headline text-lg font-bold text-[#191c1f]">
                      <AppIcon name="info" className="h-5 w-5 text-[#07006c]" />
                      Deployment Details
                    </h3>
                    <div className="mt-6 space-y-6">
                      {[
                        ["Algorithm", modelManagement.activeModel],
                        ["Environment", "CAI / Local preview"],
                        ["Artifact Path", modelManagement.artifactLocation],
                        ["Registry Status", "Verified manually"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-4">
                          <span className="field-label">{label}</span>
                          <span className="text-[13px] font-semibold text-[#191c1f]">{value}</span>
                        </div>
                      ))}
                      <div className="border-t border-[#f2f3f7] pt-4">
                        <span className="meta-label mb-2 block">
                          Endpoint Contract
                        </span>
                        <code className="block rounded-lg bg-[#f2f3f7] p-3 text-[12px] leading-[1.6] text-[#191c1f]">
                          {modelManagement.endpointContract}
                        </code>
                      </div>
                    </div>
                  </PanelCard>

                  <PanelCard className="p-6">
                    <h3 className="flex items-center gap-2 font-headline text-lg font-bold text-[#191c1f]">
                      <AppIcon name="tune" className="h-5 w-5 text-[#07006c]" />
                      Threshold Config
                    </h3>
                    <div className="mt-6 space-y-6">
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <span className="field-label">
                            Risk Sensitivity
                          </span>
                          <span className="numeric text-[13px] font-semibold text-[#a04100]">0.85</span>
                        </div>
                        <input
                          type="range"
                          defaultValue="85"
                          disabled
                          className="w-full cursor-not-allowed accent-[var(--color-brand-orange)]"
                        />
                      </div>
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <span className="field-label">
                            Auto-Block Threshold
                          </span>
                          <span className="numeric text-[13px] font-semibold text-[#a04100]">0.92</span>
                        </div>
                        <input
                          type="range"
                          defaultValue="92"
                          disabled
                          className="w-full cursor-not-allowed accent-[var(--color-brand-orange)]"
                        />
                      </div>
                      <div className="border-t border-[#f2f3f7] pt-6">
                        <p className="meta-label mb-4">
                          Deployment Bundle
                        </p>
                        <div className="space-y-4">
                      {modelManagement.championArtifacts.map((artifact) => (
                        <div
                          key={artifact}
                          className="flex items-center justify-between rounded-lg bg-[#f2f3f7] px-4 py-3"
                        >
                          <span className="text-[13px] font-semibold text-[#191c1f]">{artifact}</span>
                          <span className="meta-label">
                            Ready
                          </span>
                        </div>
                      ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <Button type="button" variant="secondary" size="md" className="flex-1">
                        Inspect
                      </Button>
                      <Button type="button" variant="secondary" size="md" className="flex-1 bg-[#07006c] text-white hover:bg-[#12006f]">
                        Apply
                      </Button>
                    </div>
                  </PanelCard>
                </StickyRail>
              </div>

              <TableCard>
                <div className="flex items-center justify-between border-b border-[#f2f3f7] px-8 py-6">
                  <h3 className="font-headline text-lg font-bold text-[#191c1f]">
                    Recent Model Pipeline Runs
                  </h3>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="primary"
                      size="md"
                      leadingIcon={<AppIcon name="refresh" className="h-3.5 w-3.5" />}
                    >
                      Retrain Model
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      leadingIcon={<AppIcon name="filter_list" className="h-3.5 w-3.5" />}
                    >
                      Filter
                    </Button>
                  </div>
                </div>
                <DataTable>
                  <thead>
                    <tr>
                      {["Version", "Training Date", "Metric (AUC)", "Status", "Deployed By", "Actions"].map((label) => (
                        <TableHeadCell key={label}>
                          {label}
                        </TableHeadCell>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2f3f7]">
                    {modelManagement.runs.map((run) => (
                      <tr key={run.version}>
                        <TableCell className="text-sm font-bold">{run.version}</TableCell>
                        <TableCell className="text-sm text-[#777681]">{run.trainingDate}</TableCell>
                        <TableCell className="text-sm font-bold">{run.auc}</TableCell>
                        <TableCell>
                          <Badge variant="deployed">
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-[#777681]">{run.deployedBy}</TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="tertiary"
                            size="sm"
                            className="h-8 w-8 rounded-lg px-0 text-[#777681] hover:bg-[#f2f3f7] hover:text-[#191c1f]"
                          >
                            <AppIcon name="more_vert" className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </tr>
                    ))}
                  </tbody>
                </DataTable>
              </TableCard>
            </PageSection>
          ) : null}
        </PageCanvas>
      </main>
    </div>
  );
}
