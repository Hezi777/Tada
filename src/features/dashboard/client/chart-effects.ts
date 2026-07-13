// Window-event bus for the AI chart "magic" effects: a glowing placeholder
// while the AI builds a chart, and a one-time reveal glow when it lands.
// Kept as events (not store state) so any surface — chatbot, future + button —
// can trigger them without threading through the dashboard store.

const GENERATING_EVENT = "tada:chart-generating";
const REVEAL_EVENT = "tada:chart-pulse";

export function emitChartGenerating(active: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(GENERATING_EVENT, { detail: { active } }),
  );
}

export function onChartGenerating(cb: (active: boolean) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    cb(Boolean((event as CustomEvent).detail?.active));
  };
  window.addEventListener(GENERATING_EVENT, handler);
  return () => window.removeEventListener(GENERATING_EVENT, handler);
}

// A freshly-created chart card may not have mounted (and subscribed) yet when
// its reveal is emitted, so the live event alone gets missed. Buffer the most
// recent reveal briefly so a just-mounted card can still pick it up once.
const REVEAL_BUFFER_MS = 2000;
let recentReveal: { chartId: string; at: number } | null = null;

export function emitChartReveal(chartId: string | undefined): void {
  if (!chartId || typeof window === "undefined") {
    return;
  }
  recentReveal = { chartId, at: Date.now() };
  window.dispatchEvent(new CustomEvent(REVEAL_EVENT, { detail: { chartId } }));
}

/** True (once) if a reveal for this chart was emitted within the buffer window
 * — lets a newly-mounted card catch a reveal it would otherwise have missed. */
export function consumeRecentReveal(chartId: string): boolean {
  if (
    recentReveal?.chartId === chartId &&
    Date.now() - recentReveal.at < REVEAL_BUFFER_MS
  ) {
    recentReveal = null;
    return true;
  }
  return false;
}

export function onChartReveal(cb: (chartId: string) => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: Event) => {
    const chartId = (event as CustomEvent).detail?.chartId;
    if (typeof chartId === "string") {
      cb(chartId);
    }
  };
  window.addEventListener(REVEAL_EVENT, handler);
  return () => window.removeEventListener(REVEAL_EVENT, handler);
}
