import {
  ChatDashboardResponseSchema,
  DeleteChainedFileRequestSchema,
  UploadDashboardResponseSchema,
  type ChatKpiValue,
  type ChatDashboardResponse,
  type ChartConfig,
  type DeleteChainedFileRequest,
  type UploadDashboardResponse,
} from "@tada/shared";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export type DashboardState = UploadDashboardResponse;

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    if (payload?.error) {
      return payload.error;
    }
  } catch {
    // ignore parse errors
  }

  return fallback;
}

export async function uploadDataset(file: File): Promise<UploadDashboardResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiBase}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "upload_failed"));
  }

  const payload = await response.json();
  return UploadDashboardResponseSchema.parse(payload);
}

export async function uploadChainedDataset(input: {
  datasetId: string;
  file: File;
}): Promise<UploadDashboardResponse> {
  const formData = new FormData();
  formData.append("datasetId", input.datasetId);
  formData.append("file", input.file);

  const response = await fetch(`${apiBase}/api/upload/chain`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "upload_chain_failed"));
  }

  const payload = await response.json();
  return UploadDashboardResponseSchema.parse(payload);
}

export async function removeChainedDatasetFile(
  input: DeleteChainedFileRequest,
): Promise<UploadDashboardResponse> {
  const request = DeleteChainedFileRequestSchema.parse(input);
  const response = await fetch(`${apiBase}/api/upload/chain`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "upload_chain_remove_failed"));
  }

  const payload = await response.json();
  return UploadDashboardResponseSchema.parse(payload);
}

export async function sendChat(input: {
  datasetId: string;
  message: string;
  chartConfigs: ChartConfig[];
  kpis: ChatKpiValue[];
}): Promise<ChatDashboardResponse> {
  const response = await fetch(`${apiBase}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "chat_failed"));
  }

  const payload = await response.json();
  return ChatDashboardResponseSchema.parse(payload);
}
