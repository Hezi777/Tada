import Papa from "papaparse";
import { randomUUID } from "node:crypto";
import path from "node:path";
import XLSX from "xlsx";
import type { DashboardState, DatasetMeta } from "./types.js";
import type { SerializedRow, UploadDashboardResponse } from "@tada/shared";
import { buildInitialChartConfigs, buildKpiConfigs } from "./dashboard-config.js";
import { inferColumns } from "./infer.js";
import { createDatasetState, setDatasetRows } from "./state.js";

type Row = Record<string, unknown>;

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
  setDatasetRows(datasetId, rows);
  const snapshot: DashboardState = createDatasetState(datasetId, columns, kpis, charts, datasetMeta);
  return {
    ...snapshot,
    fileName: file.originalname,
    rows: serializeRows(rows),
  };
}
