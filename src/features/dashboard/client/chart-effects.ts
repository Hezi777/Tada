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

export function emitChartReveal(chartId: string | undefined): void {
  if (!chartId || typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent(REVEAL_EVENT, { detail: { chartId } }));
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
