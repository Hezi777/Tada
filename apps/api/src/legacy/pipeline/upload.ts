import path from "path";
import Papa from "papaparse";
import XLSX from "xlsx";
import type { LLMPlanResponse } from "@tada/shared";
import { LLMPlanResponseSchema } from "@tada/shared";
import { normalizeDataset } from "../data/normalize";
import { buildDatasetMeta } from "../data/profile";
import { buildChartPayload } from "../data/charts";
import { profileDataset } from "../data/profile-dataset";
import { applyChartQuality } from "../data/chart-quality";
import { selectCharts } from "../data/chart-selection";
import { planDashboard } from "../llm/hf-client";
import { setDatasetRecord } from "../../state-store";

function parseCsv(buffer: Buffer): Record<string, unknown>[] {
  const parsed = Papa.parse<Record<string, unknown>>(buffer.toString("utf8"), {
    header: true,
    skipEmptyLines: true,
  });
  return parsed.data.filter((row) => Object.keys(row).length > 0);
}

function parseXlsx(buffer: Buffer): Record<string, unknown>[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: null });
}

function parseUpload(file: Express.Multer.File): Record<string, unknown>[] {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ext === ".csv" || file.mimetype.includes("csv")) {
    return parseCsv(file.buffer);
  }
  if (ext === ".xlsx" || ext === ".xls") {
    return parseXlsx(file.buffer);
  }
  return [];
}

function safePlanResponse(payload: unknown): LLMPlanResponse | null {
  const parsed = LLMPlanResponseSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

export async function handleUpload(file: Express.Multer.File) {
  const rows = parseUpload(file);
  const normalization = normalizeDataset(rows);
  const meta = buildDatasetMeta(normalization.normalizedRows, normalization.debug);
  if (normalization.debug.warnings.length) {
    console.warn("[upload] normalization warnings:", normalization.debug.warnings);
  }

  let plan: LLMPlanResponse | null = null;
  try {
    const response = await planDashboard({
      datasetMeta: meta,
      schema: meta.columns,
      rowCount: meta.rowCount,
      sampleRows: meta.sampleRows,
      numericStats: meta.numericStats,
      topCategoricalValues: meta.topCategoricalValues,
      dateRanges: meta.dateRanges,
    });
    plan = safePlanResponse(response);
  } catch {
    plan = null;
  }

  const profile = profileDataset(normalization.normalizedRows, normalization.debug);
  console.log(
    "[upload] profile summary",
    JSON.stringify(
      {
        rowCount: profile.rowCount,
        columns: profile.columns.map((column) => ({
          name: column.name,
          role: column.role,
          missingRate: Number(column.missingRate.toFixed(3)),
          cardinality: column.categorical?.cardinality ?? null,
          dateParseSuccess: Number(column.dateParseSuccess.toFixed(3)),
          isIdLike: column.isIdLike,
          isTextLong: column.isTextLong,
        })),
      },
      null,
      2
    )
  );
  const chartSpecs = selectCharts(profile, plan?.charts);
  console.log(
    "[upload] selected charts",
    JSON.stringify(
      chartSpecs.map((spec) => ({
        id: spec.id,
        type: spec.type,
        x: spec.x,
        y: spec.y ?? null,
        aggregation: spec.aggregation ?? null,
        title: spec.title,
      })),
      null,
      2
    )
  );
  const datasetTopic = plan?.datasetTopic ?? "Dataset overview";

  const rawCharts = chartSpecs.map((spec) => ({
    id: spec.id,
    spec,
    payload: buildChartPayload(spec, normalization.normalizedRows),
  }));
  const charts = applyChartQuality(rawCharts, normalization.normalizedRows, profile);

  const datasetId = `dataset_${Date.now()}`;
  const dashboardState = {
    version: 1,
    datasetId,
    datasetTopic,
    datasetMeta: meta,
    charts,
    hiddenChartIds: [],
  };

  setDatasetRecord(datasetId, {
    normalizedRows: normalization.normalizedRows,
    meta,
    dashboardState,
    debug: normalization.debug,
  });

  return {
    dashboardState,
    debug: normalization.debug,
  };
}
