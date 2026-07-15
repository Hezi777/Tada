"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { resolveTier, type CanvasTier } from "./grid";

/**
 * The single allowed layout observation in the widget system — the "trait
 * resolver" of docs/WIDGET_SIZING.md §3. Watches the canvas wrapper and
 * resolves a DISCRETE tier (like UITraitCollection resolving a size class);
 * everything below receives fixed dimensions from `grid.ts` lookups.
 * Charts themselves never measure.
 */
export function useCanvasTier<T extends HTMLElement>(): {
  ref: React.RefObject<T>;
  tier: CanvasTier;
} {
  const ref = useRef<T>(null);
  const [tier, setTier] = useState<CanvasTier>("t4");

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) {
      return;
    }
    const update = () => setTier(resolveTier(element.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, tier };
}
