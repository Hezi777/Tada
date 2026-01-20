import Papa from "papaparse";
import { randomUUID } from "node:crypto";
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
  if (parsed.errors.length > 0) {
    throw new Error("csv_parse_failed");
  }
  return (parsed.data as Row[]).filter((row) => Object.keys(row).length > 0);
}

export async function handleUpload(file: Express.Multer.File): Promise<DashboardState> {
  if (!file.buffer?.length) {
    throw new Error("empty_file");
  }
  const rows = parseCsv(file.buffer);
  const columns = inferColumns(rows);
  const kpis = buildKpis(rows, columns);
  const charts = buildCharts(rows, columns);
  const datasetId = randomUUID();
  setDatasetRows(datasetId, rows);
  return createDatasetState(datasetId, columns, kpis, charts);
}
