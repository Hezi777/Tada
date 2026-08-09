import { describe, expect, it } from "vitest";
import { resolveTier, widgetDimensions } from "./grid";

describe("responsive dashboard grid", () => {
  it("keeps the compact tier within a 320px viewport", () => {
    expect(resolveTier(320)).toBe("t1");
    expect(widgetDimensions("large", "t1").width).toBe(280);
  });

  it("accounts for the canvas side padding at tier boundaries", () => {
    expect(resolveTier(659)).toBe("t1");
    expect(resolveTier(660)).toBe("t2");
    expect(resolveTier(1044)).toBe("t3");
    expect(resolveTier(1340)).toBe("t4");
  });
});
