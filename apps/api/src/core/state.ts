import type { Chart, Column, DashboardState, DatasetMeta, Kpi } from "./types";

type Row = Record<string, unknown>;

const datasetStateStore = new Map<string, DashboardState>();
const datasetRowsStore = new Map<string, Row[]>();

export function createDatasetState(
  datasetId: string,
  columns: Column[] = [],
  kpis: Kpi[] = [],
  charts: Chart[] = [],
  datasetMeta?: DatasetMeta,
): DashboardState {
  const state: DashboardState = {
    datasetId,
    version: 1,
    columns: [...columns],
    kpis: [...kpis],
    charts: [...charts],
    hiddenChartIds: [],
    datasetMeta,
  };
  datasetStateStore.set(datasetId, state);
  return state;
}

export function setDatasetRows(datasetId: string, rows: Row[]): void {
  const storedRows = rows.map((row) => ({ ...row }));
  datasetRowsStore.set(datasetId, storedRows);
}

export function getDatasetRows(datasetId: string): Row[] | null {
  return datasetRowsStore.get(datasetId) ?? null;
}

export function getDatasetState(datasetId: string): DashboardState | null {
  return datasetStateStore.get(datasetId) ?? null;
}

export function updateDatasetState(
  datasetId: string,
  updaterFn: (current: DashboardState) => DashboardState,
): DashboardState | null {
  const current = datasetStateStore.get(datasetId);
  if (!current) {
    return null;
  }
  const next = updaterFn(current);
  const updated: DashboardState = {
    ...next,
    datasetId: current.datasetId,
    version: current.version + 1,
    columns: [...next.columns],
    kpis: [...next.kpis],
    charts: [...next.charts],
    hiddenChartIds: [...next.hiddenChartIds],
    datasetMeta: next.datasetMeta ?? current.datasetMeta,
  };
  datasetStateStore.set(datasetId, updated);
  return updated;
}
