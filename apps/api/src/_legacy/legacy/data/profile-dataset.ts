import type { NormalizedRow } from "../../state-store";
import type { NormalizationDebug } from "./normalize";

export type ColumnRole = "numeric" | "categorical" | "datetime" | "id_like" | "text_long";

export type NumericProfile = {
  min: number | null;
  max: number | null;
  mean: number | null;
  median: number | null;
  uniqueCount: number;
  integerRatio: number;
  count: number;
};

export type CategoricalProfile = {
  cardinality: number;
  topValues: Array<{ value: string; count: number }>;
};

export type ColumnProfile = {
  name: string;
  role: ColumnRole;
  baseType: "metric" | "categorical" | "dimension" | "date" | "unknown";
  missingRate: number;
  uniqueRatio: number;
  avgLength: number;
  dateParseSuccess: number;
  isIdLike: boolean;
  isTextLong: boolean;
  numeric?: NumericProfile;
  categorical?: CategoricalProfile;
};

export type DatasetProfile = {
  columns: ColumnProfile[];
  rowCount: number;
};

const ID_HINTS = ["id", "uuid", "submission", "key", "hash"];
const DATE_HINTS = ["date", "time", "year", "month"];
const LONG_TEXT_THRESHOLD = 40;
const TOP_VALUES_LIMIT = 12;

function median(values: number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function hasHint(name: string, hints: string[]): boolean {
  const lower = name.toLowerCase();
  return hints.some((hint) => lower.includes(hint));
}

export function profileDataset(
  rows: NormalizedRow[],
  debug: NormalizationDebug
): DatasetProfile {
  const columns = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row)))
  );

  const profiles = columns.map((name) => {
    const values = rows.map((row) => row[name]);
    const nonNull = values.filter((value) => value !== null && value !== undefined);
    const missingRate = rows.length === 0 ? 0 : 1 - nonNull.length / rows.length;
    const uniqueValues = new Set(nonNull.map((value) => String(value)));
    const uniqueRatio = nonNull.length === 0 ? 0 : uniqueValues.size / nonNull.length;

    let stringCount = 0;
    let totalLength = 0;
    for (const value of nonNull) {
      if (typeof value === "string") {
        stringCount += 1;
        totalLength += value.length;
      }
    }
    const avgLength = stringCount === 0 ? 0 : totalLength / stringCount;

    const baseType = debug.detectedColumnTypes[name] ?? "unknown";
    const dateParseSuccess = debug.dateParseSuccess[name]?.successRate ?? 0;
    const isIdLike = hasHint(name, ID_HINTS) || uniqueRatio > 0.98;
    const isTextLong = avgLength >= LONG_TEXT_THRESHOLD;

    let role: ColumnRole = "categorical";
    if (isIdLike) {
      role = "id_like";
    } else if (isTextLong) {
      role = "text_long";
    } else if (baseType === "date") {
      const isDateName = hasHint(name, DATE_HINTS);
      const stringBacked = (debug.dateParseSuccess[name]?.stringParsedCount ?? 0) > 0;
      const validDate = dateParseSuccess >= 0.7 && (isDateName || stringBacked);
      role = validDate ? "datetime" : "categorical";
    } else if (baseType === "metric") {
      role = "numeric";
    } else if (baseType === "categorical" || baseType === "dimension") {
      role = "categorical";
    }

    const profile: ColumnProfile = {
      name,
      role,
      baseType,
      missingRate,
      uniqueRatio,
      avgLength,
      dateParseSuccess,
      isIdLike,
      isTextLong,
    };

    if (baseType === "metric") {
      const numbers = nonNull.filter((value): value is number => typeof value === "number");
      const min = numbers.length ? Math.min(...numbers) : null;
      const max = numbers.length ? Math.max(...numbers) : null;
      const mean = numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : null;
      const integerCount = numbers.filter((value) => Number.isInteger(value)).length;
      profile.numeric = {
        min,
        max,
        mean,
        median: median(numbers),
        uniqueCount: new Set(numbers).size,
        integerRatio: numbers.length ? integerCount / numbers.length : 0,
        count: numbers.length,
      };
    }

    if (baseType === "categorical" || baseType === "dimension") {
      const counts = new Map<string, number>();
      for (const value of nonNull) {
        const key = String(value);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
      const topValues = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_VALUES_LIMIT)
        .map(([value, count]) => ({ value, count }));
      profile.categorical = {
        cardinality: counts.size,
        topValues,
      };
    }

    return profile;
  });

  return { columns: profiles, rowCount: rows.length };
}
