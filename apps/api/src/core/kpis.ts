import type { Column, DashboardState } from "./types";

type Row = Record<string, unknown>;

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

function toDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Date.parse(trimmed);
    if (Number.isFinite(parsed)) {
      return new Date(parsed);
    }
  }
  return null;
}

function formatNumber(value: number): number {
  const rounded = Math.round(value * 100) / 100;
  return Number.isFinite(rounded) ? rounded : value;
}

function formatDateRange(min: Date, max: Date): string {
  const minIso = min.toISOString().slice(0, 10);
  const maxIso = max.toISOString().slice(0, 10);
  return `${minIso} → ${maxIso}`;
}

export function buildKpis(rows: Row[], columns: Column[]): DashboardState["kpis"] {
  const totalRows = rows.length;
  const primaryNumeric = columns.find((column) => column.kind === "numeric") ?? null;
  const primaryCategory = columns.find((column) => column.kind === "categorical") ?? null;
  const primaryDate = columns.find((column) => column.kind === "date") ?? null;

  let primaryMetric: string | number = "—";
  if (primaryNumeric) {
    let sum = 0;
    let count = 0;
    for (const row of rows) {
      const value = toNumber(row[primaryNumeric.name]);
      if (value !== null) {
        sum += value;
        count += 1;
      }
    }
    if (count > 0) {
      primaryMetric = formatNumber(sum / count);
    }
  }

  let topCategory: string | number = "—";
  if (primaryCategory) {
    const counts = new Map<string, number>();
    for (const row of rows) {
      const raw = row[primaryCategory.name];
      if (raw === null || raw === undefined || raw === "") {
        continue;
      }
      const key = String(raw);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let bestKey: string | null = null;
    let bestCount = 0;
    for (const [key, count] of counts) {
      if (count > bestCount) {
        bestCount = count;
        bestKey = key;
      }
    }
    if (bestKey !== null) {
      topCategory = bestKey;
    }
  }

  let timeSpan: string = "—";
  if (primaryDate) {
    let minDate: Date | null = null;
    let maxDate: Date | null = null;
    for (const row of rows) {
      const value = toDate(row[primaryDate.name]);
      if (!value) {
        continue;
      }
      if (!minDate || value < minDate) {
        minDate = value;
      }
      if (!maxDate || value > maxDate) {
        maxDate = value;
      }
    }
    if (minDate && maxDate) {
      timeSpan = formatDateRange(minDate, maxDate);
    }
  }

  return [
    { id: "total_rows", label: "Total Rows", value: totalRows },
    { id: "primary_metric", label: "Primary Metric", value: primaryMetric },
    { id: "top_category", label: "Top Category", value: topCategory },
    { id: "time_span", label: "Time Span", value: timeSpan },
  ];
}
