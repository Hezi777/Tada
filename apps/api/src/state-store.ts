import type { DashboardState, DatasetMeta } from "@tada/shared";
import type { NormalizationDebug } from "./legacy/data/normalize";

export type NormalizedRow = Record<string, string | number | boolean | null>;

export type DatasetRecord = {
  normalizedRows: NormalizedRow[];
  meta: DatasetMeta;
  dashboardState: DashboardState;
  debug: NormalizationDebug;
};

const datasets = new Map<string, DatasetRecord>();

export function getDatasetRecord(datasetId: string): DatasetRecord | undefined {
  return datasets.get(datasetId);
}

export function setDatasetRecord(datasetId: string, record: DatasetRecord): void {
  datasets.set(datasetId, record);
}

export function updateDashboardState(
  datasetId: string,
  next: Omit<DashboardState, "version"> & { version?: number }
): DashboardState {
  const current = datasets.get(datasetId);
  const nextVersion = (current?.dashboardState.version ?? 0) + 1;
  const updated: DashboardState = {
    ...next,
    version: nextVersion,
  };
  if (!current) {
    throw new Error(`Dataset ${datasetId} not found`);
  }
  datasets.set(datasetId, {
    ...current,
    dashboardState: updated,
  });
  return updated;
}
