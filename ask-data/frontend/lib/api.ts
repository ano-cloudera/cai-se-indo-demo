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
  mode?: string | null;
}

export interface RagQueryConfiguration {
  enable_hyde: boolean;
  enable_summary_filter: boolean;
  enable_tool_calling: boolean;
  disable_streaming: boolean;
  selected_tools: string[];
}

export interface RagModelOption {
  model_id: string;
  name: string;
  available: boolean;
  replica_count: number;
  tool_calling_supported: boolean;
}

export interface RagKnowledgeBaseOption {
  id: number;
  name: string;
  description?: string | null;
  document_count: number;
  embedding_model?: string | null;
  summarization_model?: string | null;
  metadata: Record<string, unknown>;
}

export interface RagOptionsResponse {
  enabled: boolean;
  model_source?: string | null;
  chat_models: RagModelOption[];
  rerank_models: RagModelOption[];
  knowledge_bases: RagKnowledgeBaseOption[];
}

export interface RagSessionConfig {
  session_id: string;
  enabled: boolean;
  session_name: string;
  project_id: number | null;
  knowledge_base_id: number | null;
  knowledge_base_name?: string | null;
  rag_session_id?: number | null;
  inference_model_id?: string | null;
  inference_model_name?: string | null;
  rerank_model_id?: string | null;
  rerank_model_name?: string | null;
  response_chunks: number;
  query_configuration: RagQueryConfiguration;
}

function getApiBaseUrl(): string {
  return "/api/backend";
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
  ragOptions: () => request<RagOptionsResponse>("/rag/options"),
  getRagConfig: (sessionId: string) =>
    request<RagSessionConfig>(`/rag/config/${sessionId}`),
  saveRagConfig: (payload: RagSessionConfig) =>
    request<RagSessionConfig>("/rag/config", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getBaseUrl: getApiBaseUrl,
};
