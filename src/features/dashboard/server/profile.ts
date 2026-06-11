import type {
  ColumnProfile,
  DatasetProfile,
  SerializedValue,
} from "@/shared/contracts";
import type { Column } from "./types";

type Row = Record<string, unknown>;

// Automatic data profiling. Pure TS by design — no LLM is needed to count
// nulls. PII detection matters twice: flagged columns are excluded from LLM
// prompt samples and from the embedded data chunks.

const PII_NAME_PATTERN =
  /email|mail|phone|tel|address|passport|ssn|מייל|דוא"ל|טלפון|נייד|כתובת|ת"ז|תעודת זהות|דרכון/i;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Israeli mobile/landline (with or without dash) and 9-digit national IDs.
const IL_PHONE_PATTERN = /^0\d{1,2}-?\d{7}$/;
const NINE_DIGIT_ID_PATTERN = /^\d{9}$/;

function isPiiValue(value: unknown): boolean {
  if (typeof value !== "string" && typeof value !== "number") {
    return false;
  }
  const text = String(value).trim();
  return (
    EMAIL_PATTERN.test(text) ||
    IL_PHONE_PATTERN.test(text) ||
    NINE_DIGIT_ID_PATTERN.test(text)
  );
}

function toSerializedValue(value: unknown): SerializedValue {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }
  return value === undefined ? null : String(value);
}

function profileColumn(rows: Row[], column: Column): ColumnProfile {
  const values = rows.map((row) => toSerializedValue(row[column.name]));
  const nonNull = values.filter(
    (value): value is string | number | boolean =>
      value !== null && value !== "",
  );
  const nullCount = values.length - nonNull.length;

  const counts = new Map<string, { value: SerializedValue; count: number }>();
  for (const value of nonNull) {
    const key = `${typeof value}:${String(value)}`;
    const entry = counts.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      counts.set(key, { value, count: 1 });
    }
  }

  let min: string | number | null = null;
  let max: string | number | null = null;
  let mean: number | null = null;

  if (column.kind === "numeric") {
    const numbers = nonNull
      .map((value) => (typeof value === "number" ? value : Number(value)))
      .filter((value) => Number.isFinite(value));
    if (numbers.length > 0) {
      min = Math.min(...numbers);
      max = Math.max(...numbers);
      mean =
        Math.round(
          (numbers.reduce((sum, value) => sum + value, 0) / numbers.length) *
            100,
        ) / 100;
    }
  } else if (nonNull.length > 0) {
    const sorted = nonNull.map((value) => String(value)).sort();
    min = sorted[0];
    max = sorted[sorted.length - 1];
  }

  let piiHits = 0;
  for (const value of nonNull) {
    if (isPiiValue(value)) {
      piiHits += 1;
    }
  }
  const isPii =
    PII_NAME_PATTERN.test(column.name) ||
    (nonNull.length > 0 && piiHits / nonNull.length > 0.3);

  return {
    name: column.name,
    kind: column.kind,
    nullCount,
    uniqueCount: counts.size,
    min,
    max,
    mean,
    topValues: isPii
      ? [] // never surface raw PII values, not even as "top values"
      : Array.from(counts.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
    isPii,
  };
}

export function profileDataset(rows: Row[], columns: Column[]): DatasetProfile {
  const columnProfiles = columns.map((column) => profileColumn(rows, column));
  return {
    rowCount: rows.length,
    columnCount: columns.length,
    columns: columnProfiles,
    piiColumns: columnProfiles
      .filter((profile) => profile.isPii)
      .map((profile) => profile.name),
  };
}

/** Strip PII columns from rows before they reach an LLM prompt or embedding. */
export function redactPiiColumns(rows: Row[], profile: DatasetProfile): Row[] {
  if (profile.piiColumns.length === 0) {
    return rows;
  }
  const piiSet = new Set(profile.piiColumns);
  return rows.map((row) => {
    const next: Row = {};
    for (const [key, value] of Object.entries(row)) {
      if (!piiSet.has(key)) {
        next[key] = value;
      }
    }
    return next;
  });
}

/** Compact human-readable summary used for topic classification + retrieval. */
export function summarizeProfile(profile: DatasetProfile): string {
  const parts = profile.columns
    .filter((column) => column.kind !== "ignored")
    .map((column) => {
      const samples = column.topValues
        .slice(0, 3)
        .map((entry) => String(entry.value))
        .join(", ");
      return `${column.name} (${column.kind}${samples ? `: ${samples}` : ""})`;
    });
  return `Dataset with ${profile.rowCount} rows. Columns: ${parts.join("; ")}`;
}
