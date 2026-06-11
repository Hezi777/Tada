import { describe, expect, it } from "vitest";
import XLSX from "xlsx";
import {
  normalizeSlashDate,
  parseUploadedFile,
  UploadValidationError,
  UPLOAD_LIMITS,
} from "./parse";

function csvFile(content: string, name = "data.csv") {
  return { buffer: Buffer.from(content, "utf8"), originalname: name };
}

describe("parseUploadedFile (csv)", () => {
  it("parses headered CSV rows", async () => {
    const rows = await parseUploadedFile(
      csvFile("name,amount\nAlpha,10\nBeta,20\n"),
    );
    expect(rows).toEqual([
      { name: "Alpha", amount: "10" },
      { name: "Beta", amount: "20" },
    ]);
  });

  it("parses Hebrew headers and values", async () => {
    const rows = await parseUploadedFile(
      csvFile("קטגוריה,סכום\nמזון,150\nתחבורה,80\n"),
    );
    expect(rows[0]["קטגוריה"]).toBe("מזון");
  });

  it("rejects empty files", async () => {
    await expect(parseUploadedFile(csvFile(""))).rejects.toThrow(
      UploadValidationError,
    );
  });

  it("rejects unsupported extensions", async () => {
    await expect(
      parseUploadedFile(csvFile("a,b\n1,2", "data.exe")),
    ).rejects.toMatchObject({ code: "unsupported_file_type" });
  });

  it("rejects files over the size cap", async () => {
    const big = {
      buffer: Buffer.alloc(UPLOAD_LIMITS.maxFileBytes + 1),
      originalname: "big.csv",
    };
    await expect(parseUploadedFile(big)).rejects.toMatchObject({
      code: "file_too_large",
    });
  });
});

describe("parseUploadedFile (xlsx)", () => {
  it("parses the first sheet of a workbook", async () => {
    const sheet = XLSX.utils.json_to_sheet([
      { product: "Widget", units: 5 },
      { product: "Gadget", units: 9 },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Sheet1");
    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    }) as Buffer;

    const rows = await parseUploadedFile({
      buffer,
      originalname: "data.xlsx",
    });
    expect(rows).toEqual([
      { product: "Widget", units: 5 },
      { product: "Gadget", units: 9 },
    ]);
  });
});

describe("Israeli slash-date normalization", () => {
  it("parses DD/MM/YYYY, never US month-first", () => {
    expect(normalizeSlashDate("03/04/2025")).toBe("2025-04-03");
    expect(normalizeSlashDate("31/12/2024")).toBe("2024-12-31");
    expect(normalizeSlashDate("1.2.2025")).toBe("2025-02-01");
  });

  it("rejects impossible dates and non-dates", () => {
    expect(normalizeSlashDate("32/01/2025")).toBeNull();
    expect(normalizeSlashDate("10/13/2025")).toBeNull();
    expect(normalizeSlashDate("hello")).toBeNull();
  });

  it("normalizes date-shaped columns to ISO during parsing", async () => {
    const rows = await parseUploadedFile(
      csvFile("תאריך,amount\n03/04/2025,10\n04/04/2025,20\n05/04/2025,30\n"),
    );
    expect(rows.map((row) => row["תאריך"])).toEqual([
      "2025-04-03",
      "2025-04-04",
      "2025-04-05",
    ]);
  });

  it("leaves non-date columns with occasional slashes alone", async () => {
    const rows = await parseUploadedFile(
      csvFile("note,amount\n3/4,10\nplain,20\nother,30\nmore,40\nrows,50\n"),
    );
    expect(rows[0].note).toBe("3/4");
  });
});
