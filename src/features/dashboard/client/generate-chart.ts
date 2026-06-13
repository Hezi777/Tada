import type { ChatKpiValue } from "@/shared/contracts";
import { sendChat } from "@/shared/lib/api";
import { computeKpiValue } from "@/features/dashboard/client/runtime";
import {
  applyChatbotPatch,
  getDashboardStoreState,
} from "@/features/dashboard/client/store";
import {
  emitChartGenerating,
  emitChartReveal,
} from "@/features/dashboard/client/chart-effects";

/** Brief flourish (ms) so an AI-created chart feels conjured, not popped in. */
const GENERATE_FLOURISH_MS = 1300;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type GenerateChartResult = {
  assistantMessage: string;
  added: boolean;
};

/**
 * Ask the AI to create a chart from a natural-language prompt, routing through
 * the same /api/chat path as the chatbot, with the "magic" glow sequence:
 * generating placeholder -> chart materializes in place -> reveal glow.
 * Shared by the chatbot and the dashboard's + button.
 */
export async function generateChartFromPrompt(
  message: string,
): Promise<GenerateChartResult> {
  const state = getDashboardStoreState();
  if (!state.datasetId) {
    throw new Error("no_dataset");
  }

  const liveKpis: ChatKpiValue[] = state.kpis.map((kpi) => ({
    id: kpi.id,
    column: kpi.column,
    aggregation: kpi.aggregation,
    label: kpi.label,
    isPrimary: kpi.isPrimary,
    value: computeKpiValue(kpi, state.rows),
  }));

  const response = await sendChat({
    datasetId: state.datasetId,
    message,
    chartConfigs: state.charts,
    kpis: liveKpis,
  });

  if (response.patch?.action === "add") {
    const newChartId = response.patch.config.id;
    emitChartGenerating(true);
    await wait(GENERATE_FLOURISH_MS);
    applyChatbotPatch(response.patch);
    emitChartGenerating(false);
    // Let the new card mount (and register its reveal listener) first.
    await wait(60);
    emitChartReveal(newChartId);
    return { assistantMessage: response.assistantMessage, added: true };
  }

  if (response.patch) {
    applyChatbotPatch(response.patch);
    const chartId = response.patch.chartId;
    setTimeout(() => emitChartReveal(chartId), 60);
  }

  return { assistantMessage: response.assistantMessage, added: false };
}
