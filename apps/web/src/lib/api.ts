import {
  ChatDashboardResponseSchema,
  UploadDashboardResponseSchema,
  type ChatDashboardResponse,
  type ChartConfig,
  type UploadDashboardResponse,
} from "@tada/shared";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export type DashboardState = UploadDashboardResponse;

export async function uploadDataset(file: File): Promise<UploadDashboardResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiBase}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    let message = "upload_failed";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const payload = await response.json();
  return UploadDashboardResponseSchema.parse(payload);
}

export async function sendChat(input: {
  datasetId: string;
  message: string;
  chartConfigs: ChartConfig[];
}): Promise<ChatDashboardResponse> {
  const response = await fetch(`${apiBase}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let message = "chat_failed";
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload?.error) {
        message = payload.error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  const payload = await response.json();
  return ChatDashboardResponseSchema.parse(payload);
}
