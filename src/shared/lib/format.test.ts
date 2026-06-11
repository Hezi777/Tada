import { describe, expect, it } from "vitest";
import {
  abbreviateNumber,
  containsHebrew,
  formatDateIL,
  formatILS,
  formatNumber,
  looksLikeCurrencyColumn,
  truncateLabel,
} from "./format";

describe("abbreviateNumber", () => {
  it("abbreviates with K/M/B", () => {
    expect(abbreviateNumber(1_234_567)).toBe("1.2M");
    expect(abbreviateNumber(45_000)).toBe("45K");
    expect(abbreviateNumber(2_000_000_000)).toBe("2B");
  });

  it("keeps small numbers exact with separators", () => {
    expect(abbreviateNumber(9_876)).toBe("9,876");
    expect(abbreviateNumber(12.345)).toBe("12.35");
  });
});

describe("formatILS", () => {
  it("puts the shekel sign before the amount with no space", () => {
    expect(formatILS(1234.5)).toContain("₪1,234.5");
  });

  it("wraps the value in LTR isolation for RTL contexts", () => {
    const formatted = formatILS(50);
    expect(formatted.startsWith("⁦")).toBe(true);
    expect(formatted.endsWith("⁩")).toBe(true);
  });
});

describe("formatDateIL", () => {
  it("renders DD/MM/YYYY", () => {
    expect(formatDateIL("2025-04-03")).toContain("03/04/2025");
    expect(formatDateIL(new Date(Date.UTC(2024, 11, 31)))).toContain(
      "31/12/2024",
    );
  });

  it("passes through unparseable values", () => {
    expect(formatDateIL("not-a-date")).toBe("not-a-date");
  });
});

describe("helpers", () => {
  it("detects Hebrew text", () => {
    expect(containsHebrew("הכנסות")).toBe(true);
    expect(containsHebrew("revenue")).toBe(false);
  });

  it("detects currency-like column names in both languages", () => {
    expect(looksLikeCurrencyColumn("total_revenue")).toBe(true);
    expect(looksLikeCurrencyColumn("הכנסה חודשית")).toBe(true);
    expect(looksLikeCurrencyColumn("region")).toBe(false);
  });

  it("truncates long labels with an ellipsis", () => {
    expect(truncateLabel("a very long category label", 10)).toBe("a very lo…");
    expect(truncateLabel("short", 10)).toBe("short");
  });

  it("formats numbers with separators", () => {
    expect(formatNumber(1234567.891)).toBe("1,234,567.89");
  });
});
