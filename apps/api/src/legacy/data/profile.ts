import type { DatasetMeta } from "@tada/shared";
import type { NormalizedRow } from "../../state-store";
import type { NormalizationDebug } from "./normalize";

const TOP_VALUES_LIMIT = 10;

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

export function buildDatasetMeta(
  rows: NormalizedRow[],
  debug: NormalizationDebug
): DatasetMeta {
  const columns = Object.keys(debug.detectedColumnTypes).map((name) => ({
    name,
    type: debug.detectedColumnTypes[name],
  }));

  const numericStats: DatasetMeta["numericStats"] = {};
  const topCategoricalValues: DatasetMeta["topCategoricalValues"] = {};
  const dateRanges: DatasetMeta["dateRanges"] = {};

  for (const column of columns) {
    const values = rows.map((row) => row[column.name]).filter((value) => value !== null);
    if (column.type === "metric") {
      const nums = values.filter((value): value is number => typeof value === "number");
      const min = nums.length ? Math.min(...nums) : null;
      const max = nums.length ? Math.max(...nums) : null;
      const mean = nums.length ? nums.reduce((sum, val) => sum + val, 0) / nums.length : null;
      numericStats[column.name] = {
        min,
        max,
        mean,
        median: median(nums),
      };
    }
    if (column.type === "categorical" || column.type === "dimension") {
      const counts = new Map<string, number>();
      for (const value of values) {
        if (typeof value !== "string") {
          continue;
        }
        counts.set(value, (counts.get(value) ?? 0) + 1);
      }
      const topValues = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, TOP_VALUES_LIMIT)
        .map(([value, count]) => ({ value, count }));
      topCategoricalValues[column.name] = topValues;
    }
    if (column.type === "date") {
      const nums = values.filter((value): value is number => typeof value === "number");
      const min = nums.length ? Math.min(...nums) : null;
      const max = nums.length ? Math.max(...nums) : null;
      dateRanges[column.name] = { min, max };
    }
  }

  return {
    columns,
    rowCount: rows.length,
    sampleRows: rows.slice(0, 5),
    numericStats,
    topCategoricalValues,
    dateRanges,
  };
}
