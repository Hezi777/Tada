import path from "node:path";
import Papa from "papaparse";
import XLSX from "xlsx";
import { z } from "zod";
import { env } from "@/shared/lib/env";
import { jsonCompletion } from "@/shared/lib/ai/groq";

type Row = Record<string, unknown>;

export type UploadedFile = {
  buffer: Buffer;
  originalname: string;
};

export const UPLOAD_LIMITS = {
  maxFileBytes: 10 * 1024 * 1024,
  maxRows: 50_000,
  maxColumns: 80,
} as const;

const ALLOWED_EXTENSIONS = new Set([".csv", ".xlsx", ".xls", ".pdf"]);

export class UploadValidationError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "UploadValidationError";
  }
}

export function validateUploadedFile(file: UploadedFile): void {
  if (!file.buffer?.length) {
    throw new UploadValidationError("empty_file");
  }
  if (file.buffer.length > UPLOAD_LIMITS.maxFileBytes) {
    throw new UploadValidationError("file_too_large");
  }
  const extension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new UploadValidationError("unsupported_file_type");
  }
}

// Israeli convention: ambiguous slash dates are DD/MM/YYYY, never MM/DD
// (bi rule israeli_dates_parse_dd_mm). Normalized to ISO once at parse time so
// everything downstream sees unambiguous dates.
const SLASH_DATE_PATTERN = /^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/;

export function normalizeSlashDate(value: string): string | null {
  const match = value.trim().match(SLASH_DATE_PATTERN);
  if (!match) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) {
    year += year >= 70 ? 1900 : 2000;
  }
  if (day < 1 || day > 31 || month < 1 || month > 12 || year > 2200) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

function normalizeDateCells(rows: Row[]): Row[] {
  if (rows.length === 0) {
    return rows;
  }

  // Only rewrite columns where most values look like slash dates, so plain
  // fractions or ratios (e.g. "3/4") in other columns are left alone.
  const columnNames = Object.keys(rows[0]);
  const dateColumns = columnNames.filter((name) => {
    let candidates = 0;
    let nonEmpty = 0;
    for (const row of rows) {
      const value = row[name];
      if (value === null || value === undefined || value === "") {
        continue;
      }
      nonEmpty += 1;
      if (typeof value === "string" && normalizeSlashDate(value) !== null) {
        candidates += 1;
      }
    }
    return nonEmpty > 0 && candidates / nonEmpty >= 0.8;
  });

  if (dateColumns.length === 0) {
    return rows;
  }

  return rows.map((row) => {
    const next = { ...row };
    for (const name of dateColumns) {
      const value = next[name];
      if (typeof value === "string") {
        const normalized = normalizeSlashDate(value);
        if (normalized) {
          next[name] = normalized;
        }
      }
    }
    return next;
  });
}

function parseCsv(buffer: Buffer): Row[] {
  const parsed = Papa.parse<Row>(buffer.toString("utf8"), {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new UploadValidationError("csv_parse_failed");
  }
  return parsed.data.filter((row) => Object.keys(row).length > 0);
}

function parseExcel(buffer: Buffer): Row[] {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return [];
  }
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: null }) as Row[];
}

const PdfRowsSchema = z.object({
  rows: z.array(z.record(z.union([z.string(), z.number(), z.null()]))),
});

/**
 * Deterministic-first PDF table extraction: pull the text layer and look for
 * delimiter-consistent lines. Falls back to one LLM extraction pass for PDFs
 * whose text layout loses the table structure.
 */
async function parsePdf(buffer: Buffer): Promise<Row[]> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });

  if (!text.trim()) {
    throw new UploadValidationError("pdf_no_text_layer");
  }

  const tableRows = extractDelimitedTable(text);
  if (tableRows && tableRows.length > 1) {
    return tableRows;
  }

  const extracted = await jsonCompletion(
    [
      "Extract the tabular data from this document text as JSON.",
      'Schema: {"rows":[{"column name":"value", ...}]}. Use the document\'s own column headers as keys (keep Hebrew headers in Hebrew). Use null for missing cells. Numbers as numbers.',
      "If there is no tabular data at all, return {\"rows\":[]}.",
      "Document text:",
      text.slice(0, 8000),
    ].join("\n"),
    PdfRowsSchema,
    { model: env.GROQ_DASHBOARD_MODEL, maxTokens: 4000, temperature: 0 },
  );

  if (!extracted || extracted.rows.length === 0) {
    throw new UploadValidationError("pdf_no_table_found");
  }
  return extracted.rows;
}

function extractDelimitedTable(text: string): Row[] | null {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  for (const delimiter of [/\t+/, / {2,}/, /,/]) {
    const split = lines.map((line) => line.split(delimiter).map((c) => c.trim()));
    const widths = split.map((cells) => cells.length);
    const headerIndex = widths.findIndex((width) => width >= 2);
    if (headerIndex === -1) {
      continue;
    }
    const width = widths[headerIndex];
    const body = split
      .slice(headerIndex + 1)
      .filter((cells) => cells.length === width);
    // Require most subsequent lines to align with the header width.
    if (width < 2 || body.length < 2 || body.length < (lines.length - headerIndex - 1) * 0.6) {
      continue;
    }
    const headers = split[headerIndex];
    return body.map((cells) => {
      const row: Row = {};
      headers.forEach((header, index) => {
        const cell = cells[index] ?? null;
        const numeric = cell !== null && cell !== "" ? Number(cell.replace(/,/g, "")) : NaN;
        row[header] = Number.isFinite(numeric) && cell !== "" ? numeric : cell;
      });
      return row;
    });
  }
  return null;
}

export async function parseUploadedFile(file: UploadedFile): Promise<Row[]> {
  validateUploadedFile(file);

  const extension = path.extname(file.originalname).toLowerCase();
  let rows: Row[];
  if (extension === ".xlsx" || extension === ".xls") {
    rows = parseExcel(file.buffer);
  } else if (extension === ".pdf") {
    rows = await parsePdf(file.buffer);
  } else {
    rows = parseCsv(file.buffer);
  }

  if (rows.length === 0) {
    throw new UploadValidationError("empty_dataset");
  }
  if (rows.length > UPLOAD_LIMITS.maxRows) {
    throw new UploadValidationError("too_many_rows");
  }
  if (Object.keys(rows[0]).length > UPLOAD_LIMITS.maxColumns) {
    throw new UploadValidationError("too_many_columns");
  }

  return normalizeDateCells(rows);
}
