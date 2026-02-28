import { useSyncExternalStore } from "react";
import type {
  ChatbotChartPatch,
  ChartConfig,
  DashboardColumn,
  DatasetMeta,
  KPIConfig,
  LoadedDatasetFile,
  SerializedRow,
  UploadDashboardResponse,
} from "@tada/shared";
import {
  toStoreContext,
  validateChartCollection,
  validateKpiCollection,
} from "@/lib/dashboard-runtime";

type DashboardStoreState = {
  datasetId: string | null;
  version: number;
  fileName: string | null;
  columns: DashboardColumn[];
  datasetMeta?: DatasetMeta;
  files: LoadedDatasetFile[];
  rows: SerializedRow[];
  charts: ChartConfig[];
  kpis: KPIConfig[];
};

type Listener = () => void;

const listeners = new Set<Listener>();

let state: DashboardStoreState = {
  datasetId: null,
  version: 0,
  fileName: null,
  columns: [],
  datasetMeta: undefined,
  files: [],
  rows: [],
  charts: [],
  kpis: [],
};

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function normalizeOrders(charts: ChartConfig[]): ChartConfig[] {
  return [...charts]
    .sort((left, right) => left.order - right.order)
    .map((chart, index) => ({ ...chart, order: index }));
}

function setState(next: DashboardStoreState): void {
  state = next;
  emit();
}

function validateNextState(next: DashboardStoreState): void {
  const chartError = validateChartCollection(
    normalizeOrders(next.charts),
    toStoreContext({
      columns: next.columns,
      rows: next.rows,
      datasetMeta: next.datasetMeta,
    }),
  );
  if (chartError) {
    throw new Error(chartError);
  }
  const kpiError = validateKpiCollection(next.kpis);
  if (kpiError) {
    throw new Error(kpiError);
  }
}

function withValidatedState(updater: (current: DashboardStoreState) => DashboardStoreState): void {
  const next = updater(state);
  const normalized: DashboardStoreState = {
    ...next,
    charts: normalizeOrders(next.charts),
  };
  validateNextState(normalized);
  setState(normalized);
}

function prepareInitialState(
  snapshot: UploadDashboardResponse,
): DashboardStoreState {
  const next: DashboardStoreState = {
    datasetId: snapshot.datasetId,
    version: snapshot.version,
    fileName: snapshot.fileName,
    columns: snapshot.columns,
    datasetMeta: snapshot.datasetMeta,
    files: snapshot.files,
    rows: snapshot.rows,
    charts: normalizeOrders(snapshot.charts),
    kpis: [...snapshot.kpis],
  };
  validateNextState(next);
  return next;
}

export function initializeDashboardStore(snapshot: UploadDashboardResponse): void {
  setState(prepareInitialState(snapshot));
}

export function resetDashboardStore(): void {
  setState({
    datasetId: null,
    version: 0,
    fileName: null,
    columns: [],
    datasetMeta: undefined,
    files: [],
    rows: [],
    charts: [],
    kpis: [],
  });
}

export function getDashboardStoreState(): DashboardStoreState {
  return state;
}

export function applyDatasetChainSnapshot(snapshot: UploadDashboardResponse): void {
  const keepCurrentCharts =
    state.datasetId === snapshot.datasetId && state.charts.length > 0
      ? normalizeOrders(state.charts)
      : normalizeOrders(snapshot.charts);

  const next: DashboardStoreState = {
    datasetId: snapshot.datasetId,
    version:
      state.datasetId === snapshot.datasetId
        ? Math.max(state.version + 1, snapshot.version)
        : snapshot.version,
    fileName: snapshot.fileName,
    columns: snapshot.columns,
    datasetMeta: snapshot.datasetMeta,
    files: snapshot.files,
    rows: snapshot.rows,
    charts: keepCurrentCharts,
    kpis: [...snapshot.kpis],
  };

  validateNextState(next);
  setState(next);
}

export function addChart(config: ChartConfig): void {
  withValidatedState((current) => ({
    ...current,
    version: current.version + 1,
    charts: [...current.charts, config],
  }));
}

export function removeChart(id: string): void {
  withValidatedState((current) => ({
    ...current,
    version: current.version + 1,
    charts: current.charts.filter((chart) => chart.id !== id),
  }));
}

export function updateChart(id: string, patch: Partial<ChartConfig>): void {
  withValidatedState((current) => ({
    ...current,
    version: current.version + 1,
    charts: current.charts.map((chart) =>
      chart.id === id
        ? {
            ...chart,
            ...patch,
            id: chart.id,
          }
        : chart,
    ),
  }));
}

export function reorderCharts(orderedIds: string[]): void {
  withValidatedState((current) => {
    const chartMap = new Map(current.charts.map((chart) => [chart.id, chart]));
    const reordered = orderedIds
      .map((id) => chartMap.get(id))
      .filter((chart): chart is ChartConfig => Boolean(chart));
    const remaining = current.charts.filter((chart) => !orderedIds.includes(chart.id));
    return {
      ...current,
      version: current.version + 1,
      charts: [...reordered, ...remaining].map((chart, index) => ({ ...chart, order: index })),
    };
  });
}

export function setKPI(id: string, patch: Partial<KPIConfig>): void {
  withValidatedState((current) => ({
    ...current,
    version: current.version + 1,
    kpis: current.kpis.map((kpi) => (kpi.id === id ? { ...kpi, ...patch, id: kpi.id } : kpi)),
  }));
}

export function applyChatbotPatch(patch: ChatbotChartPatch | null): void {
  if (!patch) {
    return;
  }
  if (patch.action === "add") {
    addChart(patch.config);
    return;
  }
  if (patch.action === "remove") {
    removeChart(patch.chartId);
    return;
  }
  updateChart(patch.chartId, patch.config);
}

export function useDashboardStore<T>(selector: (snapshot: DashboardStoreState) => T): T {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => selector(state),
    () => selector(state),
  );
}

declare global {
  interface Window {
    tadaDashboardStore?: {
      addChart: typeof addChart;
      removeChart: typeof removeChart;
      updateChart: typeof updateChart;
      reorderCharts: typeof reorderCharts;
      setKPI: typeof setKPI;
      applyChatbotPatch: typeof applyChatbotPatch;
      getState: typeof getDashboardStoreState;
    };
  }
}

if (typeof window !== "undefined") {
  window.tadaDashboardStore = {
    addChart,
    removeChart,
    updateChart,
    reorderCharts,
    setKPI,
    applyChatbotPatch,
    getState: getDashboardStoreState,
  };
}
