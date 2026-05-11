export interface DetectionItem {
  label: string;
  confidence: number;
  bbox: [number, number, number, number];
}

export interface ModelInfo {
  name: string;
  version: string;
  framework: string;
  source: string;
}

export interface InferenceResponse {
  case_id: string;
  status: string;
  finding: string;
  confidence: number;
  severity: string;
  detections: DetectionItem[];
  summary: string;
  explanation: string;
  action_items: string[];
  annotated_image_path: string | null;
  model_info: ModelInfo;
}

export type XrayUiState = "idle" | "selected" | "analyzing" | "success" | "error";
export type ResponseLanguage = "en" | "id";
export type AnalysisStep = "uploading" | "detecting" | "generating" | "done";

export interface AnalysisProgress {
  step: AnalysisStep;
  partialResult?: Partial<InferenceResponse>;
}

const MOCK_RESPONSE: InferenceResponse = {
  case_id: "XRAY-0001",
  status: "success",
  finding: "pneumothorax",
  confidence: 0.91,
  severity: "high",
  detections: [
    {
      label: "pneumothorax",
      confidence: 0.91,
      bbox: [120, 80, 340, 290],
    },
  ],
  summary: "Potential abnormal finding detected. Clinical review recommended.",
  explanation:
    "The model identified a suspicious abnormal region in the chest X-ray that may require urgent clinical review.",
  action_items: [
    "Review the image with a radiologist",
    "Correlate with symptoms and oxygen saturation",
    "Escalate if respiratory distress is present",
  ],
  annotated_image_path: null,
  model_info: {
    name: "xray-yolo11",
    version: "0.1.0",
    framework: "ultralytics-yolo11",
    source: "local-dev",
  },
};

function getApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://127.0.0.1:8000";
}

function useMockMode(): boolean {
  return (process.env.NEXT_PUBLIC_XRAY_USE_MOCK ?? "false").toLowerCase() === "true";
}

function resolveAnnotatedImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  if (/^(https?:|blob:|data:)/i.test(imagePath)) return imagePath;
  if (/^\/(?!Users\/|private\/|var\/|home\/)/.test(imagePath)) {
    return `${getApiBaseUrl()}${imagePath}`;
  }
  if (/^[A-Za-z]:\\/.test(imagePath) || imagePath.startsWith("/")) return null;
  return `${getApiBaseUrl()}/${imagePath.replace(/^\.?\//, "")}`;
}

function cloneMockResponse(): InferenceResponse {
  return {
    ...MOCK_RESPONSE,
    detections: MOCK_RESPONSE.detections.map((item) => ({ ...item })),
    action_items: [...MOCK_RESPONSE.action_items],
    model_info: { ...MOCK_RESPONSE.model_info },
  };
}

function localizeMockResponse(responseLanguage: ResponseLanguage, payload: InferenceResponse): InferenceResponse {
  if (responseLanguage === "id") {
    return {
      ...payload,
      summary: "Terdapat temuan potensial. Review klinis dianjurkan.",
      explanation: "Model mengidentifikasi area abnormal yang perlu ditinjau dalam konteks klinis yang sesuai.",
      action_items: [
        "Tinjau citra bersama radiolog",
        "Korelasikan dengan gejala dan saturasi oksigen",
        "Eskalasi bila terdapat distress pernapasan",
      ],
    };
  }
  return payload;
}

async function inferWithBackend(
  file: File,
  responseLanguage: ResponseLanguage,
  onProgress?: (progress: AnalysisProgress) => void,
): Promise<InferenceResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("response_language", responseLanguage);

  onProgress?.({ step: "uploading" });

  const response = await fetch(`${getApiBaseUrl()}/api/v1/infer/stream`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok || !response.body) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let partial: Partial<InferenceResponse> = {};

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const eventMatch = chunk.match(/^event: (\w+)/m);
      const dataMatch = chunk.match(/^data: (.+)/m);
      if (!eventMatch || !dataMatch) continue;

      const event = eventMatch[1];
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(dataMatch[1]);
      } catch {
        continue;
      }

      if (event === "error") {
        throw new Error((data.detail as string) || "Inference failed");
      }

      if (event === "progress") {
        const step = (data.step as string) === "generating" ? "generating" : "uploading";
        onProgress?.({ step, partialResult: partial });
      }

      if (event === "detection") {
        partial = {
          finding: data.finding as string,
          confidence: data.confidence as number,
          severity: data.severity as string,
          detections: data.detections as DetectionItem[],
          annotated_image_path: resolveAnnotatedImageUrl(data.annotated_image_path as string | null),
          model_info: data.model_info as ModelInfo,
        };
        onProgress?.({ step: "detecting", partialResult: partial });
      }

      if (event === "result") {
        const payload = data as unknown as InferenceResponse;
        return {
          ...payload,
          annotated_image_path: resolveAnnotatedImageUrl(payload.annotated_image_path),
        };
      }
    }
  }

  throw new Error("Stream ended without a result event");
}

async function inferWithMock(file: File, responseLanguage: ResponseLanguage): Promise<InferenceResponse> {
  await new Promise((resolve) => window.setTimeout(resolve, 900));
  const base = cloneMockResponse();
  const localized = localizeMockResponse(responseLanguage, base);
  const fileStem = file.name.replace(/\.[^.]+$/, "").toUpperCase().slice(0, 12) || "XRAY";
  return {
    ...localized,
    case_id: `XRAY-${fileStem}`,
    annotated_image_path: URL.createObjectURL(file),
    model_info: {
      ...localized.model_info,
      source: "mock-mode",
    },
  };
}

export const xrayApi = {
  async infer(
    file: File,
    responseLanguage: ResponseLanguage = "en",
    onProgress?: (progress: AnalysisProgress) => void,
  ): Promise<InferenceResponse> {
    if (useMockMode()) return inferWithMock(file, responseLanguage);
    return inferWithBackend(file, responseLanguage, onProgress);
  },
  getApiBaseUrl,
  resolveAnnotatedImageUrl,
  useMockMode,
};
