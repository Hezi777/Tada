import { describe, expect, it } from "vitest";
import { inferColumns } from "./infer";

describe("inferColumns", () => {
  it("keeps a near-unique numeric business measure", () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({
      revenue: 100.25 + index * 7.13,
    }));

    expect(inferColumns(rows)).toContainEqual({
      name: "revenue",
      kind: "numeric",
    });
  });

  it("keeps ordinary name dimensions", () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({
      "Product Name": ["Widget", "Gadget", "Gizmo"][index % 3],
    }));

    expect(inferColumns(rows)).toContainEqual({
      name: "Product Name",
      kind: "categorical",
    });
  });

  it("still ignores explicit identifier columns", () => {
    const rows = Array.from({ length: 20 }, (_, index) => ({
      customer_id: 10000 + index,
    }));

    expect(inferColumns(rows)).toContainEqual({
      name: "customer_id",
      kind: "ignored",
    });
  });
});
