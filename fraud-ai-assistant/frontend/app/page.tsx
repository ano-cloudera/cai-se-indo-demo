"use client";

import { useEffect, useMemo, useState } from "react";

import type { ChatQueryResponse, HealthResponse, SQLExecuteResponse } from "@/lib/api";
import { apiClient } from "@/lib/api";
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

function getRiskBadgeClasses(level: RiskLevel) {
  if (level === "critical") {
    return "bg-[#ba1a1a] text-white";
  }
  if (level === "high") {
    return "bg-[#ff7a2f] text-white";
  }
  return "bg-[#d9dade] text-[#191c1f]";
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
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#ffffff] p-5 shadow-sm">
      <div className={`absolute left-0 top-0 h-1 w-full ${barColor}`} />
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#777681]">
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <h3 className="font-headline text-2xl font-bold text-[#191c1f]">{value}</h3>
        <span className="text-[10px] font-bold text-[#777681]">
          {detail}
        </span>
      </div>
    </div>
  );
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
    <div className="flex items-start justify-between gap-4">
      <div>
        <h3 className="font-headline text-xl font-bold text-[#191c1f]">{title}</h3>
        <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#777681]">
          {subtitle}
        </p>
      </div>
      {icon ? (
        <span className="material-symbols-outlined text-[20px] text-[#4a4cd2]">
          {icon}
        </span>
      ) : null}
    </div>
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
  const toneClass =
    tone === "good"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "warn"
        ? "bg-orange-100 text-orange-700"
        : "bg-[#edeef2] text-[#474650]";
  return (
    <div className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${toneClass}`}>
      {label}: {value}
    </div>
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
    <button
      type="button"
      onClick={onClick}
      className={`mx-2 flex w-[calc(100%-1rem)] items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${
        active
          ? "scale-[0.98] bg-[#5C63F2] text-white"
          : "text-[#6C6FF5] hover:bg-white/10"
      }`}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
      <span className="font-headline text-sm font-medium tracking-wide">{label}</span>
    </button>
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
  const toneClass =
    tone === "orange"
      ? "bg-[#ffdbcc] text-[#7a3000]"
      : tone === "indigo"
        ? "bg-[#e1e0ff] text-[#3030ba]"
        : "bg-[#edeef2] text-[#474650]";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${toneClass}`}
    >
      <span className="material-symbols-outlined text-[12px]">{icon}</span>
      {label}
    </span>
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
    <div className="min-h-screen bg-[#f8f9fd] text-[#191c1f]">
      <aside className="fixed left-0 top-0 z-50 flex h-full w-64 flex-col overflow-hidden bg-[#08004D] py-6 shadow-2xl">
        <div className="px-6">
          <div className="text-2xl font-black tracking-tighter text-[#FF7A2F]">CLOUDERA</div>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#6C6FF5]">
            Fraud AI Intelligence
          </p>
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

      <header className="fixed left-64 right-0 top-0 z-40 flex h-16 items-center justify-between border-b-2 border-[#5F67F6] bg-white px-8 shadow-sm">
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#474650]">
            Fraud AI Intelligence
          </span>
          <span className="h-4 w-px bg-[#c8c5d2]" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#191c1f]">
            Latest update {new Date().toLocaleString("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        <div className="flex items-center gap-6">
          <button
            type="button"
            className="flex items-center gap-2 text-[#1F2430] transition-colors hover:text-[#5F67F6]"
          >
            <span className="material-symbols-outlined text-[18px]">group</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.24em]">Users</span>
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edeef2] text-xs font-bold text-[#08004D]">
            TD
          </div>
        </div>
      </header>

      <main className="ml-64 min-h-screen bg-[#f2f3f7] pt-16">
        <div className="mx-auto max-w-[1600px] space-y-8 px-8 pb-8 pt-8">
          <div className="mb-8">
            <h1 className="font-headline text-[2.2rem] font-extrabold tracking-tight text-[#191c1f]">
              {activePage.title}
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-[#474650]">{activePage.subtitle}</p>
          </div>

          {activeView === "dashboard" ? (
            <section className="space-y-6">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[#f2f3f7] p-2">
                  {["Last 24 Hours", "All Channels", "Risk: All Levels"].map((item) => (
                    <div
                      key={item}
                      className="rounded-lg bg-[#ffffff] px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-[#191c1f]"
                    >
                      {item}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg bg-[#ff7a2f] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white"
                  >
                    <span className="material-symbols-outlined text-[14px]">filter_list</span>
                    Apply
                  </button>
                </div>
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
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
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
              </div>

              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 overflow-hidden rounded-xl bg-white p-8 shadow-sm lg:col-span-8">
                  <div className="mb-8 flex items-center justify-between gap-4">
                    <SectionTitle
                      title="Fraud Signal Velocity"
                      subtitle="Intelligent scoring timeline"
                      icon="monitoring"
                    />
                    <div className="flex gap-4">
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                        <span className="h-2 w-2 rounded-full bg-[#ff7a2f]" />
                        Alerts
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
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
                  <div className="mt-4 flex justify-between px-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                    {dashboard.trend.map((point) => (
                      <span key={point.label}>{point.label}</span>
                    ))}
                  </div>
                </div>

                <div className="col-span-12 flex flex-col justify-between rounded-xl bg-white p-8 shadow-sm lg:col-span-4">
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
                        <span className="block font-headline text-3xl font-extrabold">
                          {dominantChannel ? `${dominantChannel.pct.toFixed(0)}%` : "--"}
                        </span>
                        <span className="block text-[8px] font-bold uppercase tracking-[0.18em] text-[#777681]">
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
                            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                              {item.label}
                            </p>
                            <p className="text-sm font-bold text-[#191c1f]">{pct.toFixed(1)}%</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="col-span-12 rounded-xl bg-white p-8 shadow-sm lg:col-span-4">
                  <SectionTitle
                    title="Risk Modalities"
                    subtitle="Primary drivers"
                    icon="neurology"
                  />
                  <div className="mt-8 space-y-6">
                    {dashboard.modalities.map((item) => (
                      <div key={item.label} className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-[0.18em]">
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
                </div>

                <div className="col-span-12 overflow-hidden rounded-xl bg-white shadow-sm lg:col-span-8 lg:flex">
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
                            <span className="text-xs font-bold text-[#777681]">
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
                </div>

                <div className="col-span-12 flex flex-col justify-between rounded-xl bg-[#7174fa] p-8 text-white shadow-sm lg:col-span-4">
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-headline text-xl font-bold">Sentinel Force</h3>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                          Live team capacity
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-white/70">groups</span>
                    </div>
                  </div>
                  <div className="my-8 space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Open Alerts</span>
                      <span className="text-3xl font-black">
                        {formatInteger(dashboard.summary.activeAlerts)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Team Load</span>
                      <span className="rounded bg-[#ff7a2f] px-2 py-0.5 text-[10px] font-black uppercase">
                        Heavy
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10">
                      <div className="h-full w-[88%] rounded-full bg-[#ff7a2f]" />
                    </div>
                  </div>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-2 rounded-lg bg-white/10 py-3 text-[10px] font-bold uppercase tracking-[0.18em] transition-colors hover:bg-white/20"
                  >
                    Adjust Routing
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </button>
                </div>

                <div className="col-span-12 overflow-hidden rounded-xl bg-white shadow-sm lg:col-span-8">
                  <div className="flex items-center justify-between border-b border-[#f2f3f7] px-8 py-6">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#4a4cd2]">
                        crisis_alert
                      </span>
                      <h3 className="font-headline text-xl font-bold text-[#191c1f]">
                        Critical Intelligence Log
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#4a4cd2] hover:underline"
                      onClick={() => setActiveView("investigations")}
                    >
                      View All Records
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-[#f2f3f7]/60">
                          {["TX ID", "Amount", "Risk Level", "Probability", "Scored At"].map((label) => (
                            <th
                              key={label}
                              className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-[#777681]"
                            >
                              {label}
                            </th>
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
                              <td className="px-8 py-5">
                                <p className="text-sm font-bold">#TX-{item.transactionId}</p>
                                <p className="text-[10px] font-medium text-[#777681]">
                                  CUST_{item.customerId}
                                </p>
                              </td>
                              <td className="px-8 py-5 text-sm font-bold">
                                {formatCurrency(item.amount)}
                              </td>
                              <td className="px-8 py-5">
                                <span
                                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] ${getRiskBadgeClasses(
                                    riskLevel,
                                  )}`}
                                >
                                  {riskLevel === "critical" ? (
                                    <span className="material-symbols-outlined text-[10px]">
                                      priority_high
                                    </span>
                                  ) : null}
                                  {getRiskLabel(riskLevel)}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-sm font-bold text-[#ff7a2f]">
                                {formatProbability(item.combinedRiskScore)}
                              </td>
                              <td className="px-8 py-5 text-right text-[10px] font-bold text-[#777681]">
                                {item.transactionTimestamp.slice(11, 19)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeView === "investigations" ? (
            <section className="space-y-6">
              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 rounded-xl bg-white p-6 shadow-sm lg:col-span-8">
                  <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <SectionTitle
                      title="Investigations Queue"
                      subtitle="Review suspicious transactions, linked entities, and case status"
                      icon="policy"
                    />
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className="rounded-lg bg-[#f2f3f7] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#474650]"
                      >
                        Export CSV
                      </button>
                      <button
                        type="button"
                        className="rounded-lg bg-[#ff7a2f] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
                      >
                        Filter Results
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                          {["Case ID", "Transaction", "Risk Level", "Probability", "Status", "Action"].map((item) => (
                            <th key={item} className="px-4 py-3">
                              {item}
                            </th>
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
                              <td className="px-4 py-4">
                                <p className="text-xs font-bold text-[#08004D]">
                                  #FR-{item.customerId}
                                </p>
                                <p className="text-[10px] text-[#777681]">Open case</p>
                              </td>
                              <td className="px-4 py-4 text-sm font-semibold">
                                TXN-{item.transactionId}
                              </td>
                              <td className="px-4 py-4">
                                <span
                                  className={`inline-flex rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] ${getRiskBadgeClasses(
                                    riskLevel,
                                  )}`}
                                >
                                  {getRiskLabel(riskLevel)}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-sm font-bold text-[#ff7a2f]">
                                {formatProbability(item.combinedRiskScore)}
                              </td>
                              <td className="px-4 py-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#777681]">
                                {item.fraudFlag === 1 ? "Open" : "Pending"}
                              </td>
                              <td className="px-4 py-4">
                                <button
                                  type="button"
                                  className="rounded bg-[#edeef2] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#474650]"
                                >
                                  Review
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="col-span-12 rounded-xl bg-white p-6 shadow-sm lg:col-span-4">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                        Case Profile
                      </p>
                      <h3 className="mt-1 font-headline text-2xl font-extrabold text-[#08004D]">
                        #FR-{selectedTransaction?.customerId ?? "----"}
                      </h3>
                    </div>
                    <button
                      type="button"
                      className="text-[#ff7a2f]"
                      aria-label="Share case"
                    >
                      <span className="material-symbols-outlined">share</span>
                    </button>
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
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                          Account Profile
                        </p>
                        <div className="mt-4 flex items-start gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-sm font-bold text-[#08004D]">
                            {String(selectedTransaction.customerId).slice(-2)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#191c1f]">
                              Customer {selectedTransaction.customerId}
                            </p>
                            <p className="text-xs text-[#777681]">
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
                        <button
                          type="button"
                          className="rounded-lg bg-[#08004D] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
                        >
                          Freeze Account
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-[#ffdad6] px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#93000a]"
                        >
                          Escalate Case
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>

                <div className="col-span-12 rounded-xl bg-white p-6 shadow-sm lg:col-span-6">
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
                          <span className="material-symbols-outlined text-[20px]">{node.icon}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="mt-4 text-xs text-[#777681]">
                    Linked signals: device reuse, beneficiary change, and network context for the active case.
                  </p>
                </div>

                <div className="col-span-12 space-y-6 lg:col-span-6">
                  <div className="rounded-xl bg-white p-6 shadow-sm">
                    <SectionTitle
                      title="Transaction Timeline"
                      subtitle="Event sequence"
                      icon="timeline"
                    />
                    <div className="mt-6 space-y-5">
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
                                <p className="text-sm font-semibold text-[#191c1f]">{event.title}</p>
                                <p className="mt-1 text-xs text-[#777681]">{event.detail}</p>
                              </div>
                            </div>
                          ))
                        : null}
                    </div>
                  </div>

                  <div className="rounded-xl bg-white p-6 shadow-sm">
                    <SectionTitle
                      title="Analyst Intelligence Notes"
                      subtitle="Internal directives"
                      icon="edit_note"
                    />
                    <div className="mt-6 rounded-xl bg-[#f2f3f7] p-4 text-sm text-[#777681]">
                      Add analyst observations here. Use this panel to capture escalation notes, model concerns, or next-step instructions for the current case.
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                        Sarah Johnson mentioned this case in #fraud-ops-general
                      </p>
                      <button
                        type="button"
                        className="rounded-lg bg-[#08004D] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
                      >
                        Save Note
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeView === "assistant" ? (
            <section className="grid grid-cols-12 gap-8">
              <div className="col-span-12 flex min-h-[720px] flex-col overflow-hidden rounded-xl bg-white shadow-sm lg:col-span-8">
                <div className="h-1 w-full bg-[linear-gradient(135deg,#a04100_0%,#ff7a2f_100%)]" />
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
                            <span className="material-symbols-outlined text-[15px]">smart_toy</span>
                          </div>
                          <div className="max-w-[92%] flex-1 rounded-2xl rounded-tl-none border border-[#c8c5d2]/20 bg-[#f2f3f7] px-6 py-5">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#777681]">
                              Assistant
                            </p>
                            <p className="mt-3 text-sm leading-7 text-[#191c1f]">{message.text}</p>
                            {message.note ? (
                              <div className="mt-4 flex items-center gap-3 rounded-lg bg-[#ffdad6]/60 p-3">
                                <span className="material-symbols-outlined text-[#ba1a1a]">
                                  report
                                </span>
                                <span className="text-xs font-semibold text-[#93000a]">
                                  {message.note}
                                </span>
                              </div>
                            ) : null}
                            {message.table ? (
                              <div className="mt-5 overflow-hidden rounded-lg bg-white">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-[#e7e8ec]/60 text-[#777681]">
                                    <tr>
                                      {["Transaction ID", "Probability", "Risk Level", "Status"].map((label) => (
                                        <th
                                          key={label}
                                          className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.18em]"
                                        >
                                          {label}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#f2f3f7]">
                                    {message.table.map((row) => (
                                      <tr key={row.transactionId}>
                                        <td className="px-4 py-3 font-medium">{row.transactionId}</td>
                                        <td className="px-4 py-3 font-bold text-[#ff7a2f]">
                                          {row.probability}
                                        </td>
                                        <td className="px-4 py-3">
                                          <span
                                            className={`rounded px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] ${getRiskBadgeClasses(
                                              row.riskLevel,
                                            )}`}
                                          >
                                            {getRiskLabel(row.riskLevel)}
                                          </span>
                                        </td>
                                        <td className="px-4 py-3">{row.status}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
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
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                          {card.title}
                        </p>
                        <p className="mt-2 text-sm text-[#191c1f]">{card.body}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 rounded-lg bg-[#f2f3f7] px-4 py-3">
                    <input
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
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-[#777681]"
                    />
                    <button
                      type="button"
                      onClick={() => void submitAssistantQuestion(assistant.question)}
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ff7a2f] text-white shadow-lg transition-opacity hover:opacity-90"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={openSelectedTransactionInAssistant}
                      className="rounded-lg bg-[#08004D] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
                    >
                      Use Selected Case
                    </button>
                    <button
                      type="button"
                      onClick={resetAssistantConversation}
                      className="rounded-lg bg-[#edeef2] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#474650]"
                    >
                      Reset Session
                    </button>
                  </div>
                </div>
              </div>

              <div className="col-span-12 space-y-6 lg:col-span-4">
                <div className="rounded-xl bg-white p-6 shadow-sm">
                  <SectionTitle
                    title="Real-Time Context"
                    subtitle="Current signal state"
                    icon="monitoring"
                  />
                  <div className="space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                        Total Transactions
                      </span>
                      <span className="font-headline text-2xl font-extrabold text-[#191c1f]">
                        {formatInteger(dashboard.summary.totalTransactions)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                        Flagged
                      </span>
                      <span className="font-headline text-2xl font-extrabold text-[#ba1a1a]">
                        {formatInteger(dashboard.summary.flaggedTransactions)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                        Highest Count
                      </span>
                      <span className="font-headline text-2xl font-extrabold text-[#ff7a2f]">
                        {formatInteger(dashboard.summary.highRiskEvents)}
                      </span>
                    </div>
                    <div className="rounded-lg bg-[#f2f3f7] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                        Model Performance
                      </p>
                      <p className="mt-2 text-sm font-semibold text-[#191c1f]">
                        {dashboard.summary.averageProbabilityPct.toFixed(1)}% average probability
                      </p>
                      <p className="mt-1 text-xs text-[#777681]">
                        Current model: {modelManagement.activeModel}
                      </p>
                    </div>
                    <div className="rounded-lg bg-[#f2f3f7] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                        Action Model
                      </p>
                      <p className="mt-2 text-sm text-[#191c1f]">
                        Sentinel-v1 recommends moving the most critical cases into Investigations for analyst confirmation.
                      </p>
                    </div>
                    <div className="rounded-lg bg-[#f2f3f7] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                        Recent Context
                      </p>
                      <p className="mt-2 text-sm text-[#191c1f]">
                        {selectedTransaction
                          ? `Customer ${selectedTransaction.customerId} from ${selectedTransaction.originCity} is the active case in view.`
                          : "No case selected."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-[#08004D] p-6 text-white shadow-sm">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/60">
                    System Status
                  </p>
                  <h3 className="mt-2 font-headline text-2xl font-extrabold">
                    Security Core {health.usingFallback ? "Preview" : "Active"}
                  </h3>
                  <p className="mt-3 text-sm text-white/80">
                    {health.usingFallback
                      ? "Frontend preview mode is active while the backend is offline."
                      : "The fraud assistant backend is connected and ready for live SQL-backed answers."}
                  </p>
                  <div className="mt-5 flex items-center justify-between">
                    <button
                      type="button"
                      className="rounded-lg bg-white/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em]"
                    >
                      View Log
                    </button>
                    <span className="material-symbols-outlined text-[#ff7a2f]">shield</span>
                  </div>
                </div>
              </div>
            </section>
          ) : null}

          {activeView === "models" ? (
            <section className="space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg bg-[#f2f3f7] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#474650]"
                  >
                    <span className="material-symbols-outlined text-[16px]">refresh</span>
                    Rollback
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-lg bg-[#08004D] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white"
                  >
                    <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                    Deploy Version
                  </button>
                </div>
                <MiniStatus
                  label="Contract"
                  value="predictions[]"
                  tone="good"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
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

              <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 rounded-xl bg-white p-8 shadow-sm lg:col-span-8">
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
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                          {metric.label}
                        </p>
                        <p className="font-headline text-5xl font-black text-[#191c1f]">
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
                      <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                        Request Volume
                      </span>
                      <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
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
                </div>

                <div className="col-span-12 space-y-6 lg:col-span-4">
                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 font-headline text-lg font-bold text-[#191c1f]">
                      <span className="material-symbols-outlined text-[#07006c]">info</span>
                      Deployment Details
                    </h3>
                    <div className="mt-6 space-y-5">
                      {[
                        ["Algorithm", modelManagement.activeModel],
                        ["Environment", "CAI / Local preview"],
                        ["Artifact Path", modelManagement.artifactLocation],
                        ["Registry Status", "Verified manually"],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between gap-4">
                          <span className="text-xs text-[#777681]">{label}</span>
                          <span className="text-xs font-bold text-[#191c1f]">{value}</span>
                        </div>
                      ))}
                      <div className="border-t border-[#f2f3f7] pt-4">
                        <span className="mb-2 block text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]">
                          Endpoint Contract
                        </span>
                        <code className="block rounded-lg bg-[#f2f3f7] p-3 text-[10px] text-[#191c1f]">
                          {modelManagement.endpointContract}
                        </code>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 font-headline text-lg font-bold text-[#191c1f]">
                      <span className="material-symbols-outlined text-[#07006c]">tune</span>
                      Threshold Config
                    </h3>
                    <div className="mt-6 space-y-6">
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-xs font-bold text-[#777681]">
                            Risk Sensitivity
                          </span>
                          <span className="text-xs font-bold text-[#a04100]">0.85</span>
                        </div>
                        <input
                          type="range"
                          defaultValue="85"
                          disabled
                          className="w-full cursor-not-allowed accent-[#ff7a2f]"
                        />
                      </div>
                      <div>
                        <div className="mb-4 flex items-center justify-between">
                          <span className="text-xs font-bold text-[#777681]">
                            Auto-Block Threshold
                          </span>
                          <span className="text-xs font-bold text-[#a04100]">0.92</span>
                        </div>
                        <input
                          type="range"
                          defaultValue="92"
                          disabled
                          className="w-full cursor-not-allowed accent-[#ff7a2f]"
                        />
                      </div>
                      <div className="border-t border-[#f2f3f7] pt-6">
                        <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-[#777681]">
                          Deployment Bundle
                        </p>
                        <div className="space-y-4">
                      {modelManagement.championArtifacts.map((artifact) => (
                        <div
                          key={artifact}
                          className="flex items-center justify-between rounded-lg bg-[#f2f3f7] px-4 py-3"
                        >
                          <span className="text-xs font-semibold text-[#191c1f]">{artifact}</span>
                          <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#777681]">
                            Ready
                          </span>
                        </div>
                      ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-6 flex gap-3">
                      <button
                        type="button"
                        className="flex-1 rounded-lg bg-[#edeef2] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#474650]"
                      >
                        Inspect
                      </button>
                      <button
                        type="button"
                        className="flex-1 rounded-lg bg-[#07006c] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-[#f2f3f7] px-8 py-6">
                  <h3 className="font-headline text-lg font-bold text-[#191c1f]">
                    Recent Model Pipeline Runs
                  </h3>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-lg bg-[#ff7a2f] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white"
                    >
                      <span className="material-symbols-outlined text-[16px]">refresh</span>
                      Retrain Model
                    </button>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-lg bg-[#f2f3f7] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#474650]"
                    >
                      <span className="material-symbols-outlined text-[16px]">filter_list</span>
                      Filter
                    </button>
                  </div>
                </div>
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-[#f2f3f7]">
                      {["Version", "Training Date", "Metric (AUC)", "Status", "Deployed By", "Actions"].map((label) => (
                        <th
                          key={label}
                          className="px-8 py-4 text-[10px] font-bold uppercase tracking-[0.18em] text-[#777681]"
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2f3f7]">
                    {modelManagement.runs.map((run) => (
                      <tr key={run.version}>
                        <td className="px-8 py-5 text-sm font-bold">{run.version}</td>
                        <td className="px-8 py-5 text-sm text-[#777681]">{run.trainingDate}</td>
                        <td className="px-8 py-5 text-sm font-bold">{run.auc}</td>
                        <td className="px-8 py-5">
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                            {run.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-sm text-[#777681]">{run.deployedBy}</td>
                        <td className="px-8 py-5">
                          <button
                            type="button"
                            className="material-symbols-outlined text-[#777681] hover:text-[#191c1f]"
                          >
                            more_vert
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </div>
  );
}
