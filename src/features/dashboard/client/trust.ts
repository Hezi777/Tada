import type {
  ChartConfig,
  DashboardColumn,
  LoadedDatasetFile,
  SerializedRow,
} from "@/shared/contracts";

export type DashboardDateRange = {
  from: string;
  to: string;
};

export type DashboardQualityWarning = {
  id: "invalid-dates" | "missing-values" | "no-valid-dates" | "row-count";
  message: string;
};

export type DashboardTrustModel = {
  sourceLabel: string;
  rowCount: number;
  dateColumn: string | null;
  availableDateRange: DashboardDateRange | null;
  generatedAt: string | null;
  warnings: DashboardQualityWarning[];
};

type TrustInput = {
  fileName: string | null;
  files: LoadedDatasetFile[];
  columns: DashboardColumn[];
  rows: SerializedRow[];
  charts: ChartConfig[];
  expectedRowCount?: number;
};

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) {
    return null;
  }
  return new Date(timestamp);
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildDashboardTrustModel({
  fileName,
  files,
  columns,
  rows,
  charts,
  expectedRowCount,
}: TrustInput): DashboardTrustModel {
  const dateColumn =
    columns.find((column) => column.kind === "date")?.name ?? null;
  const validDates: Date[] = [];
  let invalidDateCount = 0;
  let missingValueCount = 0;

  for (const row of rows) {
    for (const column of columns) {
      const value = row[column.name];
      if (value === null || value === undefined || value === "") {
        missingValueCount += 1;
      }
    }
    if (dateColumn) {
      const value = row[dateColumn];
      if (value !== null && value !== undefined && value !== "") {
        const parsed = parseDate(value);
        if (parsed) validDates.push(parsed);
        else invalidDateCount += 1;
      }
    }
  }

  validDates.sort((left, right) => left.getTime() - right.getTime());
  const availableDateRange = validDates.length
    ? {
        from: toDateInputValue(validDates[0]),
        to: toDateInputValue(validDates[validDates.length - 1]),
      }
    : null;

  const warnings: DashboardQualityWarning[] = [];
  if (missingValueCount > 0) {
    warnings.push({
      id: "missing-values",
      message: `${missingValueCount.toLocaleString()} empty ${missingValueCount === 1 ? "cell" : "cells"} found.`,
    });
  }
  if (invalidDateCount > 0) {
    warnings.push({
      id: "invalid-dates",
      message: `${invalidDateCount.toLocaleString()} ${invalidDateCount === 1 ? "date could" : "dates could"} not be read.`,
    });
  }
  if (dateColumn && validDates.length === 0 && rows.length > 0) {
    warnings.push({
      id: "no-valid-dates",
      message: `No usable dates were found in ${dateColumn}.`,
    });
  }
  if (expectedRowCount !== undefined && expectedRowCount !== rows.length) {
    warnings.push({
      id: "row-count",
      message: `${expectedRowCount.toLocaleString()} rows were reported, but ${rows.length.toLocaleString()} are available.`,
    });
  }

  const generatedTimestamps = charts
    .map((chart) => Date.parse(chart.generatedAt))
    .filter(Number.isFinite);
  const generatedAt = generatedTimestamps.length
    ? new Date(Math.max(...generatedTimestamps)).toISOString()
    : null;
  const sourceNames = files.map((file) => file.fileName);

  return {
    sourceLabel:
      sourceNames.length > 1
        ? `${sourceNames[0]} + ${sourceNames.length - 1} more`
        : (sourceNames[0] ?? fileName ?? "Unknown source"),
    rowCount: rows.length,
    dateColumn,
    availableDateRange,
    generatedAt,
    warnings,
  };
}

export function filterRowsByDateRange(
  rows: SerializedRow[],
  dateColumn: string | null,
  range: DashboardDateRange | null,
): SerializedRow[] {
  if (!dateColumn || !range) return rows;
  const from = Date.parse(`${range.from}T00:00:00.000Z`);
  const to = Date.parse(`${range.to}T23:59:59.999Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to) || from > to) return rows;

  return rows.filter((row) => {
    const date = parseDate(row[dateColumn]);
    return date ? date.getTime() >= from && date.getTime() <= to : false;
  });
}
