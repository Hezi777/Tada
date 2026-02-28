import Papa from "papaparse";
import * as XLSX from "xlsx";

export type DatasetValue = string | number | boolean | Date | null;

export type DatasetRow = Record<string, DatasetValue>;

export type ColumnType = "number" | "date" | "boolean" | "string" | "unknown";

export interface ColumnInfo {
  name: string;
  type: ColumnType;
}

export interface DatasetState {
  fileName: string;
  rows: DatasetRow[];
  columns: ColumnInfo[];
}

function looksLikeNumber(value: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(value);
}

function looksLikeDate(value: string): boolean {
  return /[-/]|T|:/.test(value);
}

function normalizeValue(value: unknown): DatasetValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    if (looksLikeNumber(trimmed)) {
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? numeric : trimmed;
    }

    if (looksLikeDate(trimmed)) {
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }

    if (trimmed.toLowerCase() === "true") {
      return true;
    }
    if (trimmed.toLowerCase() === "false") {
      return false;
    }

    return trimmed;
  }

  return String(value);
}

function normalizeRows(rows: Record<string, unknown>[]): DatasetRow[] {
  return rows.map((row) => {
    const next: DatasetRow = {};
    for (const [key, value] of Object.entries(row)) {
      next[key] = normalizeValue(value);
    }
    return next;
  });
}

function getColumnNames(rows: DatasetRow[], seedColumns?: string[]): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  if (seedColumns) {
    for (const name of seedColumns) {
      if (!seen.has(name)) {
        seen.add(name);
        names.push(name);
      }
    }
  }
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        names.push(key);
      }
    }
  }
  return names;
}

function detectValueType(value: DatasetValue): ColumnType {
  if (value === null) {
    return "unknown";
  }
  if (typeof value === "number") {
    return "number";
  }
  if (value instanceof Date) {
    return "date";
  }
  if (typeof value === "boolean") {
    return "boolean";
  }
  if (typeof value === "string") {
    return "string";
  }
  return "unknown";
}

function inferColumns(rows: DatasetRow[], seedColumns?: string[]): ColumnInfo[] {
  const columns = getColumnNames(rows, seedColumns);
  return columns.map((name) => {
    const counts: Record<ColumnType, number> = {
      number: 0,
      date: 0,
      boolean: 0,
      string: 0,
      unknown: 0,
    };

    for (const row of rows) {
      const type = detectValueType(row[name]);
      counts[type] += 1;
    }

    let type: ColumnType = "unknown";
    if (counts.date > 0 && counts.date >= counts.number && counts.date >= counts.string) {
      type = "date";
    } else if (counts.number > 0 && counts.number >= counts.string) {
      type = "number";
    } else if (counts.boolean > 0 && counts.boolean >= counts.string) {
      type = "boolean";
    } else if (counts.string > 0) {
      type = "string";
    }

    return { name, type };
  });
}

export async function parseDatasetFile(file: File): Promise<DatasetState> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  let rawRows: Record<string, unknown>[] = [];
  let seedColumns: string[] | undefined;

  if (extension === "csv") {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
    });
    rawRows = parsed.data.filter((row) => Object.keys(row).length > 0);
    seedColumns = parsed.meta.fields ?? undefined;
  } else if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (sheetName) {
      const sheet = workbook.Sheets[sheetName];
      rawRows = XLSX.utils.sheet_to_json(sheet, { defval: null });
    }
  }

  const rows = normalizeRows(rawRows);
  const columns = inferColumns(rows, seedColumns);

  return {
    fileName: file.name,
    rows,
    columns,
  };
}
