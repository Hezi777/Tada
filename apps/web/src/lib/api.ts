export type ColumnKind = "numeric" | "categorical" | "date" | "ignored";

export type DashboardColumn = {
  name: string;
  kind: ColumnKind;
};

export type DashboardKpi = {
  id: string;
  label: string;
  value: string | number;
};

export type DashboardChartType = "bar" | "line" | "pie" | "table";
export type DashboardChartAggregation = "sum" | "avg" | "count";

export type DashboardChartConfig = {
  x?: string;
  y?: string;
  aggregation?: DashboardChartAggregation;
};

export type DashboardChart = {
  id: string;
  type: DashboardChartType;
  title: string;
  payload: unknown;
  config?: DashboardChartConfig;
};

export type DatasetMeta = {
  columns: DashboardColumn[];
  rowCount: number;
  sampleRows: Array<Record<string, unknown>>;
};

export type DashboardState = {
  datasetId: string;
  version: number;
  columns: DashboardColumn[];
  kpis: DashboardKpi[];
  charts: DashboardChart[];
  hiddenChartIds: string[];
  datasetMeta?: DatasetMeta;
};

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
  dashboardState?: DashboardState;
}): Promise<ChatResponse> {
  const response = await fetch(`${apiBase}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    let message = "Chat failed";
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

  return response.json();
}
