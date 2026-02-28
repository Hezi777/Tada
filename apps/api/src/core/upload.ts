import Papa from "papaparse";
import { randomUUID } from "node:crypto";
import path from "node:path";
import XLSX from "xlsx";
import type { DashboardState, DatasetMeta } from "./types.js";
import type { LoadedDatasetFile, SerializedRow, UploadDashboardResponse } from "@tada/shared";
import { buildInitialChartConfigs, buildKpiConfigs } from "./dashboard-config.js";
import { inferColumns } from "./infer.js";
import {
  createDatasetState,
  getDatasetFiles,
  getDatasetState,
  setDatasetFiles,
  setDatasetRows,
  updateDatasetState,
} from "./state.js";

type Row = Record<string, unknown>;
type StoredDatasetFile = {
  id: string;
  fileName: string;
  rows: Row[];
};

function serializeRows(rows: Row[]): SerializedRow[] {
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
        next[key] = value;
      } else {
        next[key] = value === undefined ? null : String(value);
      }
    }
    return next;
  });
}

function parseCsv(buffer: Buffer): Row[] {
  const parsed = Papa.parse(buffer.toString("utf8"), {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new Error("csv_parse_failed");
  }
  return (parsed.data as Row[]).filter((row) => Object.keys(row).length > 0);
}

function parseExcel(buffer: Buffer): Row[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: null }) as Row[];
}

function parseFile(file: Express.Multer.File): Row[] {
  const extension = path.extname(file.originalname).toLowerCase();
  if (extension === ".xlsx" || extension === ".xls") {
    return parseExcel(file.buffer);
  }
  return parseCsv(file.buffer);
}

const SAMPLE_ROW_LIMIT = 5;

function buildDatasetMeta(rows: Row[], columns: DashboardState["columns"]): DatasetMeta {
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

  const nextByName = new Map(nextColumns.map((column) => [column.name, column.kind]));
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
  const unexpectedColumn = nextColumns.find((column) => !existingNames.has(column.name));
  if (unexpectedColumn) {
    return `Schema mismatch: unexpected column "${unexpectedColumn.name}".`;
  }

  return null;
}

export async function handleUpload(file: Express.Multer.File): Promise<UploadDashboardResponse> {
  if (!file.buffer?.length) {
    throw new Error("empty_file");
  }
  const rows = parseFile(file);
  if (rows.length === 0) {
    throw new Error("empty_dataset");
  }
  const columns = inferColumns(rows);
  const kpis = buildKpiConfigs(rows, columns);
  const charts = await buildInitialChartConfigs(rows, columns);
  const datasetId = randomUUID();
  const datasetMeta = buildDatasetMeta(rows, columns);
  const initialFile: StoredDatasetFile = {
    id: randomUUID(),
    fileName: file.originalname,
    rows,
  };
  const mergedRows = mergeDatasetRows([initialFile]);
  setDatasetRows(datasetId, mergedRows);
  setDatasetFiles(datasetId, [initialFile]);
  const snapshot: DashboardState = createDatasetState(datasetId, columns, kpis, charts, datasetMeta);
  return buildUploadResponse(snapshot, mergedRows, [initialFile]);
}

export async function handleChainUpload(
  datasetId: string,
  file: Express.Multer.File,
): Promise<UploadDashboardResponse> {
  if (!file.buffer?.length) {
    throw new Error("empty_file");
  }

  const state = getDatasetState(datasetId);
  const existingFiles = getDatasetFiles(datasetId);
  if (!state || !existingFiles) {
    throw new Error("not_found");
  }

  const rows = parseFile(file);
  if (rows.length === 0) {
    throw new Error("empty_dataset");
  }

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
  const kpis = buildKpiConfigs(mergedRows, state.columns);

  setDatasetFiles(datasetId, nextFiles);
  setDatasetRows(datasetId, mergedRows);
  const snapshot = updateDatasetState(datasetId, {
    version: state.version + 1,
    kpis,
    datasetMeta,
  });

  return buildUploadResponse(snapshot, mergedRows, nextFiles);
}

export function handleChainRemove(datasetId: string, fileId: string): UploadDashboardResponse {
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
  const kpis = buildKpiConfigs(mergedRows, state.columns);

  setDatasetFiles(datasetId, nextFiles);
  setDatasetRows(datasetId, mergedRows);
  const snapshot = updateDatasetState(datasetId, {
    version: state.version + 1,
    kpis,
    datasetMeta,
  });

  return buildUploadResponse(snapshot, mergedRows, nextFiles);
}
