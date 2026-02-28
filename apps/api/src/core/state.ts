import type { Chart, Column, DashboardState, DatasetMeta, Kpi } from "./types.js";

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
