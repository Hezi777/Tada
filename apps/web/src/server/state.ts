import type { Chart, Column, DashboardState, DatasetMeta, Kpi } from "./types";

type Row = Record<string, unknown>;
type StoredDatasetFile = {
  id: string;
  fileName: string;
  rows: Row[];
};

const datasetStateStore = new Map<string, DashboardState>();
const datasetRowsStore = new Map<string, Row[]>();
const datasetFilesStore = new Map<string, StoredDatasetFile[]>();

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

export function updateDatasetState(
  datasetId: string,
  patch: Partial<Pick<DashboardState, "version" | "columns" | "kpis" | "charts" | "datasetMeta">>,
): DashboardState {
  const current = datasetStateStore.get(datasetId);
  if (!current) {
    throw new Error("not_found");
  }

  const next: DashboardState = {
    ...current,
    ...patch,
    columns: patch.columns ? [...patch.columns] : current.columns,
    kpis: patch.kpis ? [...patch.kpis] : current.kpis,
    charts: patch.charts ? [...patch.charts] : current.charts,
  };
  datasetStateStore.set(datasetId, next);
  return next;
}

export function setDatasetFiles(
  datasetId: string,
  files: Array<{ id: string; fileName: string; rows: Row[] }>,
): void {
  datasetFilesStore.set(
    datasetId,
    files.map((file) => ({
      id: file.id,
      fileName: file.fileName,
      rows: file.rows.map((row) => ({ ...row })),
    })),
  );
}

export function getDatasetFiles(datasetId: string): StoredDatasetFile[] | null {
  const files = datasetFilesStore.get(datasetId);
  if (!files) {
    return null;
  }
  return files.map((file) => ({
    id: file.id,
    fileName: file.fileName,
    rows: file.rows.map((row) => ({ ...row })),
  }));
}
