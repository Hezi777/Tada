import { randomUUID } from "node:crypto";
import type { DashboardState, DatasetMeta } from "./types";
import type {
  DatasetProfile,
  DatasetTopic,
  LoadedDatasetFile,
  SerializedRow,
  UploadDashboardResponse,
} from "@/shared/contracts";
import {
  buildInitialChartConfigs,
  buildKpiConfigs,
  type GenerationContext,
} from "./config";
import { inferColumns } from "./infer";
import { parseUploadedFile, type UploadedFile } from "./parse";
import { profileDataset, summarizeProfile } from "./profile";
import { classifyTopic } from "@/features/rag/server/topic";
import {
  createDatasetState,
  getDatasetFiles,
  getDatasetState,
  setDatasetFiles,
  setDatasetRows,
  updateDatasetState,
} from "./state";

type Row = Record<string, unknown>;
export type { UploadedFile } from "./parse";
type StoredDatasetFile = {
  id: string;
  fileName: string;
  rows: Row[];
};

export function serializeRows(rows: Row[]): SerializedRow[] {
  return rows.map((row) => {
    const next: SerializedRow = {};
    for (const [key, value] of Object.entries(row)) {
      if (value instanceof Date) {
        next[key] = Number.isNaN(value.getTime()) ? null : value.toISOString();
      } else if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value === null
      ) {
        next[key] = value as string | number | boolean | null;
      } else {
        next[key] = value === undefined ? null : String(value);
      }
    }
    return next;
  });
}

const SAMPLE_ROW_LIMIT = 5;

function buildDatasetMeta(
  rows: Row[],
  columns: DashboardState["columns"],
): DatasetMeta {
  return {
    columns,
    rowCount: rows.length,
    sampleRows: rows.slice(0, SAMPLE_ROW_LIMIT),
  };
}

function attachSourceFile(rows: Row[], fileName: string): Row[] {
  return rows.map((row) => ({
    ...row,
    sourceFile: fileName,
  }));
}

function mergeDatasetRows(files: StoredDatasetFile[]): Row[] {
  return files.flatMap((file) => attachSourceFile(file.rows, file.fileName));
}

function buildLoadedFiles(files: StoredDatasetFile[]): LoadedDatasetFile[] {
  return files.map((file, index) => ({
    id: file.id,
    fileName: file.fileName,
    rowCount: file.rows.length,
    isPrimary: index === 0,
  }));
}

function buildUploadResponse(
  snapshot: DashboardState,
  rows: Row[],
  files: StoredDatasetFile[],
): UploadDashboardResponse {
  return {
    ...snapshot,
    fileName: files[0]?.fileName ?? "dataset",
    rows: serializeRows(rows),
    files: buildLoadedFiles(files),
  };
}

function compareSchemaColumns(
  existingColumns: DashboardState["columns"],
  nextColumns: DashboardState["columns"],
): string | null {
  if (existingColumns.length !== nextColumns.length) {
    return `Schema mismatch: expected ${existingColumns.length} columns but received ${nextColumns.length}.`;
  }

  const nextByName = new Map(
    nextColumns.map((column) => [column.name, column.kind]),
  );
  for (const column of existingColumns) {
    const nextKind = nextByName.get(column.name);
    if (!nextKind) {
      return `Schema mismatch: missing required column "${column.name}".`;
    }
    if (nextKind !== column.kind) {
      return `Schema mismatch: column "${column.name}" must be ${column.kind}, received ${nextKind}.`;
    }
  }

  const existingNames = new Set(existingColumns.map((column) => column.name));
  const unexpectedColumn = nextColumns.find(
    (column) => !existingNames.has(column.name),
  );
  if (unexpectedColumn) {
    return `Schema mismatch: unexpected column "${unexpectedColumn.name}".`;
  }

  return null;
}

export type ProfiledUpload = {
  rows: Row[];
  columns: DashboardState["columns"];
  profile: DatasetProfile;
  suggestedTopic: DatasetTopic;
};

/** Phase 1: parse + profile + suggest a topic. No LLM, no chart generation. */
export async function profileUpload(
  file: UploadedFile,
): Promise<ProfiledUpload> {
  const rows = await parseUploadedFile(file);
  const columns = inferColumns(rows);
  const profile = profileDataset(rows, columns);
  const { topic: suggestedTopic } = await classifyTopic(
    summarizeProfile(profile),
  );
  return { rows, columns, profile, suggestedTopic };
}

/** Phase 2: grounded chart + KPI generation for a confirmed topic/count. */
export async function generateDashboardArtifacts(
  rows: Row[],
  columns: DashboardState["columns"],
  context: GenerationContext,
): Promise<Pick<DashboardState, "charts" | "kpis">> {
  const [charts, kpis] = await Promise.all([
    buildInitialChartConfigs(rows, columns, context),
    buildKpiConfigs(rows, columns),
  ]);
  return { charts, kpis };
}

/**
 * Hydrate the in-memory chat state and build the dashboard response after
 * generation (or when restoring a persisted dataset).
 */
export function buildDashboardSnapshot(input: {
  datasetId: string;
  fileName: string;
  rows: Row[];
  columns: DashboardState["columns"];
  charts: DashboardState["charts"];
  kpis: DashboardState["kpis"];
  files?: Array<{ id: string; fileName: string; rowCount: number }>;
}): UploadDashboardResponse {
  const datasetMeta = buildDatasetMeta(input.rows, input.columns);
  const storedFile: StoredDatasetFile = {
    id: input.files?.[0]?.id ?? randomUUID(),
    fileName: input.fileName,
    rows: input.rows,
  };
  setDatasetRows(input.datasetId, input.rows);
  setDatasetFiles(input.datasetId, [storedFile]);
  const snapshot = createDatasetState(
    input.datasetId,
    input.columns,
    input.kpis,
    input.charts,
    datasetMeta,
  );
  return buildUploadResponse(snapshot, input.rows, [storedFile]);
}

export async function handleChainUpload(
  datasetId: string,
  file: UploadedFile,
): Promise<UploadDashboardResponse> {
  if (!file.buffer?.length) {
    throw new Error("empty_file");
  }

  const state = getDatasetState(datasetId);
  const existingFiles = getDatasetFiles(datasetId);
  if (!state || !existingFiles) {
    throw new Error("not_found");
  }

  const rows = await parseUploadedFile(file);

  const nextColumns = inferColumns(rows);
  const schemaError = compareSchemaColumns(state.columns, nextColumns);
  if (schemaError) {
    throw new Error(schemaError);
  }

  const nextFiles: StoredDatasetFile[] = [
    ...existingFiles,
    {
      id: randomUUID(),
      fileName: file.originalname,
      rows,
    },
  ];
  const mergedRows = mergeDatasetRows(nextFiles);
  const datasetMeta = buildDatasetMeta(mergedRows, state.columns);
  const kpis = await buildKpiConfigs(mergedRows, state.columns);

  setDatasetFiles(datasetId, nextFiles);
  setDatasetRows(datasetId, mergedRows);
  const snapshot = updateDatasetState(datasetId, {
    version: state.version + 1,
    kpis,
    datasetMeta,
  });

  return buildUploadResponse(snapshot, mergedRows, nextFiles);
}

export async function handleChainRemove(
  datasetId: string,
  fileId: string,
): Promise<UploadDashboardResponse> {
  const state = getDatasetState(datasetId);
  const existingFiles = getDatasetFiles(datasetId);
  if (!state || !existingFiles) {
    throw new Error("not_found");
  }

  const targetIndex = existingFiles.findIndex((file) => file.id === fileId);
  if (targetIndex === -1) {
    throw new Error(`Unknown chained file: ${fileId}.`);
  }
  if (targetIndex === 0) {
    throw new Error("Cannot remove the primary uploaded file.");
  }

  const nextFiles = existingFiles.filter((file) => file.id !== fileId);
  const mergedRows = mergeDatasetRows(nextFiles);
  const datasetMeta = buildDatasetMeta(mergedRows, state.columns);
  const kpis = await buildKpiConfigs(mergedRows, state.columns);

  setDatasetFiles(datasetId, nextFiles);
  setDatasetRows(datasetId, mergedRows);
  const snapshot = updateDatasetState(datasetId, {
    version: state.version + 1,
    kpis,
    datasetMeta,
  });

  return buildUploadResponse(snapshot, mergedRows, nextFiles);
}
