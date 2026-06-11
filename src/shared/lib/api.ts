import {
  ChatDashboardResponseSchema,
  DeleteChainedFileRequestSchema,
  DashboardListItemSchema,
  UploadDashboardResponseSchema,
  UploadProfileResponseSchema,
  type ChartConfig,
  type ChatKpiValue,
  type ChatDashboardResponse,
  type CreateDashboardRequest,
  type DashboardListItem,
  type DeleteChainedFileRequest,
  type GenerateDashboardRequest,
  type UpdateDashboardRequest,
  type UploadDashboardResponse,
  type UploadProfileResponse,
} from "@/shared/contracts";
import { z } from "zod";

const apiBase = "";

export type DashboardState = UploadDashboardResponse;
export type DashboardLoadResponse = UploadDashboardResponse | { empty: true };

export type DashboardMeta = {
  id: string;
  name: string;
  icon: string;
  color: string;
};

export type LoadDashboardResponse =
  | (UploadDashboardResponse & { dashboard: DashboardMeta })
  | { empty: true; dashboard: DashboardMeta };

export type LoadDashboardMetaResponse =
  | {
      dashboard: DashboardMeta;
      datasetId: string;
      files: {
        id: string;
        fileName: string;
        rowCount: number;
        isPrimary: boolean;
      }[];
    }
  | { empty: true; dashboard: DashboardMeta };

async function readApiError(
  response: Response,
  fallback: string,
): Promise<string> {
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

/** Phase 1: parse + profile the file. Returns the profile + suggested topic. */
export async function uploadDataset(
  file: File,
  dashboardId?: string,
): Promise<UploadProfileResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (dashboardId) {
    formData.append("dashboardId", dashboardId);
  }

  const response = await fetch(`${apiBase}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "upload_failed"));
  }

  const payload = await response.json();
  return UploadProfileResponseSchema.parse(payload);
}

/** Phase 2: generate the grounded dashboard for a confirmed topic + count. */
export async function generateDashboard(
  input: GenerateDashboardRequest,
): Promise<UploadDashboardResponse> {
  const response = await fetch(`${apiBase}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "generate_failed"));
  }

  const payload = await response.json();
  return UploadDashboardResponseSchema.parse(payload);
}

const DEFAULT_CHART_COUNT = 4;

/** One-shot upload -> generate with the suggested topic (no confirm step). */
export async function uploadAndGenerate(
  file: File,
  dashboardId?: string,
): Promise<UploadDashboardResponse> {
  const profiled = await uploadDataset(file, dashboardId);
  return generateDashboard({
    datasetId: profiled.datasetId,
    topic: profiled.suggestedTopic,
    chartCount: DEFAULT_CHART_COUNT,
  });
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

export async function loadLatestDashboard(): Promise<DashboardLoadResponse> {
  const response = await fetch(`${apiBase}/api/dashboard`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "dashboard_load_failed"));
  }

  const payload = await response.json();
  if (payload && typeof payload === "object" && "empty" in payload) {
    return { empty: true };
  }
  return UploadDashboardResponseSchema.parse(payload);
}

export async function persistDashboardCharts(input: {
  datasetId: string;
  charts: ChartConfig[];
}): Promise<void> {
  const response = await fetch(`${apiBase}/api/dashboard/charts`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "charts_persist_failed"));
  }
}

// ── Multi-Dashboard API ──

export async function listDashboards(): Promise<DashboardListItem[]> {
  const response = await fetch(`${apiBase}/api/dashboards`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "dashboards_list_failed"));
  }

  const payload = await response.json();
  return z.array(DashboardListItemSchema).parse(payload);
}

export async function createDashboard(
  input: CreateDashboardRequest,
): Promise<DashboardListItem> {
  const response = await fetch(`${apiBase}/api/dashboards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "dashboard_create_failed"));
  }

  const payload = await response.json();
  return DashboardListItemSchema.parse(payload);
}

export async function loadDashboard(
  id: string,
): Promise<LoadDashboardResponse> {
  const response = await fetch(`${apiBase}/api/dashboards/${id}`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "dashboard_load_failed"));
  }

  const payload = await response.json();
  if (payload && typeof payload === "object" && "empty" in payload) {
    return { empty: true, dashboard: payload.dashboard };
  }

  return {
    ...UploadDashboardResponseSchema.parse(payload),
    dashboard: payload.dashboard,
  };
}

export async function loadDashboardMeta(
  id: string,
): Promise<LoadDashboardMetaResponse> {
  const response = await fetch(`${apiBase}/api/dashboards/${id}/meta`, {
    method: "GET",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "dashboard_meta_load_failed"));
  }

  const payload = await response.json();
  return payload as LoadDashboardMetaResponse;
}

export async function updateDashboard(
  id: string,
  patch: UpdateDashboardRequest,
): Promise<void> {
  const response = await fetch(`${apiBase}/api/dashboards/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "dashboard_update_failed"));
  }
}

export async function deleteDashboard(id: string): Promise<void> {
  const response = await fetch(`${apiBase}/api/dashboards/${id}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "dashboard_delete_failed"));
  }
}

export async function uploadToDashboard(
  dashboardId: string,
  file: File,
): Promise<UploadDashboardResponse> {
  return uploadAndGenerate(file, dashboardId);
}

export async function removeFileFromDashboard(
  dashboardId: string,
  datasetId: string,
): Promise<void> {
  const response = await fetch(
    `${apiBase}/api/dashboards/${dashboardId}/datasets`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ datasetId }),
    },
  );

  if (!response.ok) {
    throw new Error(await readApiError(response, "file_remove_failed"));
  }
}
