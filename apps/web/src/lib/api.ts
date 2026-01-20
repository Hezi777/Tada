import type { DashboardState } from "@tada/shared";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export interface ChatResponse {
  assistantMessage: string;
  dashboardState: DashboardState;
}

export async function uploadDataset(file: File): Promise<DashboardState> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${apiBase}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  return response.json();
}

export async function sendChat(input: {
  datasetId: string;
  message: string;
  dashboardVersion: number;
}): Promise<ChatResponse> {
  const response = await fetch(`${apiBase}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("Chat failed");
  }

  return response.json();
}
