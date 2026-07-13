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
