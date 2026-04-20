export interface HealthResponse {
  status: string;
  service?: string;
  environment?: string;
  debug?: boolean;
  database?: string;
  result?: number | null;
}

export interface SQLGenerateResponse {
  session_id: string | null;
  original_question: string;
  raw_generated_sql: string;
  cleaned_generated_sql: string;
  model: string;
  deployment: string;
}

export interface SQLExecuteResponse {
  executed_sql: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  row_count: number;
  truncated: boolean;
  limit_applied: boolean;
}

export interface ChatQueryResponse {
  session_id: string | null;
  original_question: string;
  answer: string;
  generated_sql: string;
  executed_sql: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  row_count: number;
  truncated: boolean;
  limit_applied: boolean;
  metadata: Record<string, unknown>;
}

export interface ChatAnswerResponse {
  session_id: string | null;
  original_question: string;
  answer: string;
}

function getApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (!baseUrl) {
    throw new Error(
      "NEXT_PUBLIC_API_BASE_URL is not set. Point the frontend to the backend API first.",
    );
  }
  return baseUrl.replace(/\/+$/, "");
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    try {
      const data = (await response.json()) as { detail?: string };
      if (data.detail) {
        message = data.detail;
      }
    } catch {
      // Keep the default message when the backend response is not JSON.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export const apiClient = {
  health: () => request<HealthResponse>("/health"),
  healthDb: () => request<HealthResponse>("/health/db"),
  generateSql: (payload: { question: string; session_id?: string }) =>
    request<SQLGenerateResponse>("/sql/generate", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  executeSql: (payload: { sql: string; session_id?: string }) =>
    request<SQLExecuteResponse>("/sql/execute", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  chatQuery: (payload: { question: string; session_id?: string }) =>
    request<ChatQueryResponse>("/chat/query", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  chatAnswer: (payload: { question: string; session_id?: string }) =>
    request<ChatAnswerResponse>("/chat/answer", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getBaseUrl: getApiBaseUrl,
};
