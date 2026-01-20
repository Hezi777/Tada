import type { Chart, Column, ColumnKind } from "./types";
import { pickPrimaryColumns } from "./infer";

type Row = Record<string, unknown>;

const TABLE_PREVIEW_LIMIT = 20;

function buildTablePreview(rows: Row[]): Chart["payload"] {
  const previewRows = rows.slice(0, TABLE_PREVIEW_LIMIT);
  const columns = previewRows.length > 0 ? Object.keys(previewRows[0]) : [];
  return {
    columns,
    rows: previewRows,
  };
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function parseDateValue(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  if (/^[0-9]+$/.test(trimmed)) {
    if (trimmed.length === 8) {
      const year = Number(trimmed.slice(0, 4));
      const month = Number(trimmed.slice(4, 6));
      const day = Number(trimmed.slice(6, 8));
      if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return new Date(Date.UTC(year, month - 1, day));
      }
    }
    return null;
  }
  const parsed = Date.parse(trimmed);
  return Number.isFinite(parsed) ? new Date(parsed) : null;
}

function getColumnByKind(columns: Column[], kind: ColumnKind): Column | null {
  return columns.find((column) => column.kind === kind) ?? null;
}

function buildCountByCategory(rows: Row[], category: Column | null): Chart {
  if (!category) {
    return {
      id: "count_by_category",
      type: "table",
      title: "Count by Category",
      payload: buildTablePreview(rows),
    };
  }
  const counts = new Map<string, number>();
  for (const row of rows) {
    const raw = row[category.name];
    if (raw === null || raw === undefined || raw === "") {
      continue;
    }
    const key = String(raw);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, 10);
  const other = sorted.slice(10).reduce((sum, [, count]) => sum + count, 0);
  const labels = top.map(([label]) => label);
  const values = top.map(([, count]) => count);
  if (other > 0) {
    labels.push("Other");
    values.push(other);
  }
  return {
    id: "count_by_category",
    type: "bar",
    title: "Count by Category",
    payload: { labels, values },
  };
}

function buildAvgNumericByCategory(
  rows: Row[],
  numeric: Column | null,
  category: Column | null,
): Chart {
  if (!numeric || !category) {
    return {
      id: "avg_numeric_by_category",
      type: "table",
      title: "Avg Numeric by Category",
      payload: buildTablePreview(rows),
    };
  }
  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const categoryValue = row[category.name];
    if (categoryValue === null || categoryValue === undefined || categoryValue === "") {
      continue;
    }
    const numericValue = toNumber(row[numeric.name]);
    if (numericValue === null) {
      continue;
    }
    const key = String(categoryValue);
    const current = totals.get(key) ?? { sum: 0, count: 0 };
    current.sum += numericValue;
    current.count += 1;
    totals.set(key, current);
  }
  const averages = Array.from(totals.entries())
    .filter(([, value]) => value.count > 0)
    .map(([label, value]) => ({ label, avg: value.sum / value.count }))
    .sort((a, b) => b.avg - a.avg);
  return {
    id: "avg_numeric_by_category",
    type: "bar",
    title: "Avg Numeric by Category",
    payload: {
      labels: averages.map((item) => item.label),
      values: averages.map((item) => Math.round(item.avg * 100) / 100),
    },
  };
}

function buildNumericDistribution(rows: Row[], numeric: Column | null): Chart {
  if (!numeric) {
    return {
      id: "numeric_distribution",
      type: "table",
      title: "Numeric Distribution",
      payload: buildTablePreview(rows),
    };
  }
  const values: number[] = [];
  for (const row of rows) {
    const value = toNumber(row[numeric.name]);
    if (value !== null) {
      values.push(value);
    }
  }
  if (values.length === 0) {
    return {
      id: "numeric_distribution",
      type: "table",
      title: "Numeric Distribution",
      payload: buildTablePreview(rows),
    };
  }
  const n = values.length;
  const binCount = Math.max(8, Math.min(20, Math.round(Math.sqrt(n))));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const step = range === 0 ? 1 : range / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({
    min: min + step * index,
    max: min + step * (index + 1),
    count: 0,
  }));
  for (const value of values) {
    const bucket = range === 0 ? 0 : Math.min(binCount - 1, Math.floor((value - min) / step));
    bins[bucket].count += 1;
  }
  const labels = bins.map((bin) => {
    const left = Math.round(bin.min * 100) / 100;
    const right = Math.round(bin.max * 100) / 100;
    return `${left}–${right}`;
  });
  return {
    id: "numeric_distribution",
    type: "bar",
    title: "Numeric Distribution",
    payload: { labels, values: bins.map((bin) => bin.count) },
  };
}

function buildOverTime(rows: Row[], dateColumn: Column | null): Chart {
  if (!dateColumn) {
    return {
      id: "over_time",
      type: "table",
      title: "Over Time",
      payload: buildTablePreview(rows),
    };
  }
  const counts = new Map<string, number>();
  for (const row of rows) {
    const dateValue = parseDateValue(row[dateColumn.name]);
    if (!dateValue) {
      continue;
    }
    const label = `${dateValue.getUTCFullYear()}-${String(dateValue.getUTCMonth() + 1).padStart(2, "0")}`;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const ordered = Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  return {
    id: "over_time",
    type: "line",
    title: "Over Time",
    payload: {
      labels: ordered.map(([label]) => label),
      values: ordered.map(([, count]) => count),
    },
  };
}

export function buildCharts(rows: Row[], columns: Column[]): Chart[] {
  const { primaryCategory, primaryNumeric, primaryDate } = pickPrimaryColumns(columns);
  const safeCategory = primaryCategory && primaryCategory.kind !== "ignored" ? primaryCategory : null;
  const safeNumeric = primaryNumeric && primaryNumeric.kind !== "ignored" ? primaryNumeric : null;
  const safeDate = primaryDate && primaryDate.kind !== "ignored" ? primaryDate : null;

  return [
    buildCountByCategory(rows, safeCategory),
    buildAvgNumericByCategory(rows, safeNumeric, safeCategory),
    buildNumericDistribution(rows, safeNumeric),
    buildOverTime(rows, safeDate),
  ];
}
