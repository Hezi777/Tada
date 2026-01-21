import Papa from "papaparse";
import { randomUUID } from "node:crypto";
import path from "node:path";
import XLSX from "xlsx";
import type { DashboardState } from "./types";
import { inferColumns } from "./infer";
import { buildCharts } from "./charts";
import { buildKpis } from "./kpis";
import { createDatasetState, setDatasetRows } from "./state";

type Row = Record<string, unknown>;

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

export async function handleUpload(file: Express.Multer.File): Promise<DashboardState> {
  if (!file.buffer?.length) {
    throw new Error("empty_file");
  }
  const rows = parseFile(file);
  const columns = inferColumns(rows);
  const kpis = buildKpis(rows, columns);
  const charts = buildCharts(rows, columns);
  const datasetId = randomUUID();
  setDatasetRows(datasetId, rows);
  return createDatasetState(datasetId, columns, kpis, charts);
}
