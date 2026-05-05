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

async function inferWithBackend(file: File, responseLanguage: ResponseLanguage): Promise<InferenceResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("response_language", responseLanguage);

  const response = await fetch(`${getApiBaseUrl()}/api/v1/infer`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}`;
    try {
      const payload = (await response.json()) as { detail?: string };
      if (payload.detail) detail = payload.detail;
    } catch {
      // Keep the default message when the response body is not JSON.
    }
    throw new Error(detail);
  }

  const payload = (await response.json()) as InferenceResponse;
  return {
    ...payload,
    annotated_image_path: resolveAnnotatedImageUrl(payload.annotated_image_path),
  };
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
  async infer(file: File, responseLanguage: ResponseLanguage = "en"): Promise<InferenceResponse> {
    if (useMockMode()) return inferWithMock(file, responseLanguage);
    return inferWithBackend(file, responseLanguage);
  },
  getApiBaseUrl,
  resolveAnnotatedImageUrl,
  useMockMode,
};
