import type { ColumnType } from "@tada/shared";
import type { NormalizedRow } from "../../state-store";

const DATE_NAME_HINTS = ["date", "time", "year", "month"];

type DateParseInfo = {
  successRate: number;
  parsedCount: number;
  totalCount: number;
  stringParsedCount: number;
  numericParsedCount: number;
};

export type NormalizationDebug = {
  detectedColumnTypes: Record<string, ColumnType>;
  dateParseSuccess: Record<string, DateParseInfo>;
  durationUnitCounts: { minutes: number; seasons: number };
  warnings: string[];
};

export type NormalizationResult = {
  normalizedRows: NormalizedRow[];
  debug: NormalizationDebug;
};

function isNumericValue(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseNumeric(value: unknown): number | null {
  if (isNumericValue(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseDateValue(value: unknown): number | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.getTime();
  }
  if (isNumericValue(value)) {
    return value > 1000000000 ? value : null;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

function parseDurationValue(value: unknown): { minutes: number | null; seasons: number | null } {
  if (isNumericValue(value)) {
    return { minutes: value, seasons: null };
  }
  if (typeof value !== "string") {
    return { minutes: null, seasons: null };
  }
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return { minutes: null, seasons: null };
  }
  const numberMatch = trimmed.match(/[\d.]+/);
  const amount = numberMatch ? Number(numberMatch[0]) : null;
  if (!amount || Number.isNaN(amount)) {
    return { minutes: null, seasons: null };
  }
  if (trimmed.includes("season")) {
    return { minutes: null, seasons: amount };
  }
  if (trimmed.includes("min")) {
    return { minutes: amount, seasons: null };
  }
  return { minutes: amount, seasons: null };
}

function findTypeColumn(columns: string[]): string | null {
  return columns.find((col) => col.toLowerCase() === "type") ?? null;
}

function detectDateColumns(rows: Record<string, unknown>[], columns: string[]): Record<string, DateParseInfo> {
  const results: Record<string, DateParseInfo> = {};
  for (const column of columns) {
    let parsedCount = 0;
    let totalCount = 0;
    let stringParsedCount = 0;
    let numericParsedCount = 0;
    for (const row of rows) {
      const raw = row[column];
      if (raw === null || raw === undefined || raw === "") {
        continue;
      }
      totalCount += 1;
      const parsed = parseDateValue(raw);
      if (parsed !== null) {
        parsedCount += 1;
        if (typeof raw === "string") {
          stringParsedCount += 1;
        }
        if (typeof raw === "number") {
          numericParsedCount += 1;
        }
      }
    }
    const successRate = totalCount === 0 ? 0 : parsedCount / totalCount;
    results[column] = {
      successRate,
      parsedCount,
      totalCount,
      stringParsedCount,
      numericParsedCount,
    };
  }
  return results;
}

function isDateColumn(column: string, info: DateParseInfo): boolean {
  const lower = column.toLowerCase();
  const nameHint = DATE_NAME_HINTS.some((hint) => lower.includes(hint));
  const stringBacked = info.stringParsedCount > 0;
  return nameHint || (info.successRate >= 0.6 && stringBacked);
}

function detectDurationColumn(columns: string[]): string | null {
  return columns.find((col) => col.toLowerCase().includes("duration")) ?? null;
}

export function normalizeDataset(rawRows: Record<string, unknown>[]): NormalizationResult {
  const columns = Array.from(
    new Set(rawRows.flatMap((row) => Object.keys(row)))
  );
  const typeColumn = findTypeColumn(columns);
  const durationColumn = detectDurationColumn(columns);
  const dateParseInfo = detectDateColumns(rawRows, columns);
  const detectedColumnTypes: Record<string, ColumnType> = {};
  const warnings: string[] = [];

  let minutesCount = 0;
  let seasonsCount = 0;

  const normalizedRows: NormalizedRow[] = rawRows.map((row) => {
    const next: NormalizedRow = {};
    for (const column of columns) {
      const raw = row[column];
      const dateInfo = dateParseInfo[column];
      if (dateInfo && isDateColumn(column, dateInfo)) {
        next[column] = parseDateValue(raw);
        detectedColumnTypes[column] = "date";
        continue;
      }
      const numeric = parseNumeric(raw);
      if (numeric !== null) {
        next[column] = numeric;
        detectedColumnTypes[column] = "metric";
        continue;
      }
      if (typeof raw === "boolean") {
        next[column] = raw;
        detectedColumnTypes[column] = "dimension";
        continue;
      }
      if (raw === null || raw === undefined || raw === "") {
        next[column] = null;
        continue;
      }
      next[column] = String(raw);
      detectedColumnTypes[column] = "categorical";
    }

    if (durationColumn) {
      const durationRaw = row[durationColumn];
      const parsed = parseDurationValue(durationRaw);
      let durationMinutes = parsed.minutes;
      let durationSeasons = parsed.seasons;
      const typeValue =
        typeColumn && typeof row[typeColumn] === "string"
          ? row[typeColumn].toLowerCase()
          : null;
      if (typeValue?.includes("tv")) {
        durationMinutes = null;
      }
      if (typeValue?.includes("movie")) {
        durationSeasons = null;
      }
      if (durationMinutes !== null) {
        minutesCount += 1;
      }
      if (durationSeasons !== null) {
        seasonsCount += 1;
      }
      next.duration_minutes = durationMinutes;
      next.seasons_count = durationSeasons;
      next.duration_unit = durationMinutes !== null ? "min" : durationSeasons !== null ? "season" : null;
    }

    return next;
  });

  if (durationColumn) {
    if (minutesCount > 0 && seasonsCount > 0) {
      warnings.push("Duration values include both minutes and seasons; split columns created.");
    }
    detectedColumnTypes.duration_minutes = "metric";
    detectedColumnTypes.seasons_count = "metric";
    detectedColumnTypes.duration_unit = "categorical";
  }

  return {
    normalizedRows,
    debug: {
      detectedColumnTypes,
      dateParseSuccess: dateParseInfo,
      durationUnitCounts: { minutes: minutesCount, seasons: seasonsCount },
      warnings,
    },
  };
}
