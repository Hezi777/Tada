import { describe, expect, it } from "vitest";
import { profileDataset, redactPiiColumns, summarizeProfile } from "./profile";
import type { Column } from "./types";

const columns: Column[] = [
  { name: "amount", kind: "numeric" },
  { name: "category", kind: "categorical" },
  { name: "email", kind: "ignored" },
  { name: "phone", kind: "categorical" },
];

const rows = [
  {
    amount: 100,
    category: "A",
    email: "dana@example.com",
    phone: "052-1234567",
  },
  {
    amount: 200,
    category: "B",
    email: "yossi@test.co.il",
    phone: "054-7654321",
  },
  { amount: 300, category: "A", email: "noa@mail.com", phone: "03-1234567" },
  { amount: null, category: "A", email: null, phone: null },
];

describe("profileDataset", () => {
  it("computes numeric stats", () => {
    const profile = profileDataset(rows, columns);
    const amount = profile.columns.find((c) => c.name === "amount");
    expect(amount).toMatchObject({
      kind: "numeric",
      nullCount: 1,
      uniqueCount: 3,
      min: 100,
      max: 300,
      mean: 200,
    });
  });

  it("computes categorical top values", () => {
    const profile = profileDataset(rows, columns);
    const category = profile.columns.find((c) => c.name === "category");
    expect(category?.topValues[0]).toEqual({ value: "A", count: 3 });
  });

  it("flags PII columns by name and by value pattern", () => {
    const profile = profileDataset(rows, columns);
    expect(profile.piiColumns).toContain("email");
    expect(profile.piiColumns).toContain("phone");
    expect(profile.piiColumns).not.toContain("amount");
  });

  it("flags Israeli 9-digit ID values even without a name hint", () => {
    const idColumns: Column[] = [{ name: "customer_ref", kind: "categorical" }];
    const idRows = [
      { customer_ref: "123456789" },
      { customer_ref: "987654321" },
      { customer_ref: "456789123" },
    ];
    const profile = profileDataset(idRows, idColumns);
    expect(profile.piiColumns).toContain("customer_ref");
  });

  it("never surfaces raw PII values in topValues", () => {
    const profile = profileDataset(rows, columns);
    const email = profile.columns.find((c) => c.name === "email");
    expect(email?.isPii).toBe(true);
    expect(email?.topValues).toEqual([]);
  });

  it("counts rows and columns", () => {
    const profile = profileDataset(rows, columns);
    expect(profile.rowCount).toBe(4);
    expect(profile.columnCount).toBe(4);
  });

  it("reports invalid dates and incomplete rows without dropping them", () => {
    const qualityColumns: Column[] = [
      { name: "sale_date", kind: "date" },
      { name: "revenue_ils", kind: "numeric" },
    ];
    const profile = profileDataset(
      [
        { sale_date: "2026-01-01", revenue_ils: 100 },
        { sale_date: "not-a-date", revenue_ils: 50 },
        { sale_date: "", revenue_ils: null },
      ],
      qualityColumns,
    );

    expect(profile.invalidDateRowCount).toBe(1);
    expect(profile.incompleteRowCount).toBe(1);
    expect(
      profile.columns.find((column) => column.name === "sale_date")
        ?.invalidCount,
    ).toBe(1);
  });

  it("adds conservative currency, percentage, and quantity hints", () => {
    const semanticColumns: Column[] = [
      { name: "revenue_ils", kind: "numeric" },
      { name: "gross_margin_pct", kind: "numeric" },
      { name: "units_sold", kind: "numeric" },
    ];
    const profile = profileDataset(
      [{ revenue_ils: 100, gross_margin_pct: 25, units_sold: 2 }],
      semanticColumns,
    );

    expect(profile.columns[0]).toMatchObject({
      semanticType: "currency",
      unit: "ILS",
    });
    expect(profile.columns[1]).toMatchObject({
      semanticType: "percentage",
      unit: "%",
    });
    expect(profile.columns[2]).toMatchObject({ semanticType: "quantity" });
  });
});

describe("redactPiiColumns", () => {
  it("removes PII columns from rows", () => {
    const profile = profileDataset(rows, columns);
    const redacted = redactPiiColumns(rows, profile);
    expect(Object.keys(redacted[0])).toEqual(["amount", "category"]);
  });

  it("is a no-op without PII", () => {
    const cleanColumns: Column[] = [{ name: "amount", kind: "numeric" }];
    const cleanRows = [{ amount: 5 }];
    const profile = profileDataset(cleanRows, cleanColumns);
    expect(redactPiiColumns(cleanRows, profile)).toBe(cleanRows);
  });
});

describe("summarizeProfile", () => {
  it("describes columns without ignored ones", () => {
    const profile = profileDataset(rows, columns);
    const summary = summarizeProfile(profile);
    expect(summary).toContain("4 rows");
    expect(summary).toContain("amount (numeric");
    expect(summary).not.toContain("email");
  });
});
