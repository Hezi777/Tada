import { LLMChatResponseSchema, ChartSpecSchema } from "@tada/shared";
import { buildChartPayload } from "../data/charts";
import { applyChartQuality } from "../data/chart-quality";
import { profileDataset } from "../data/profile-dataset";
import { chatActions } from "../llm/hf-client";
import { getDatasetRecord, updateDashboardState } from "../../state-store";

export async function handleChat(input: {
  datasetId: string;
  message: string;
  dashboardVersion: number;
}) {
  const record = getDatasetRecord(input.datasetId);
  if (!record) {
    throw new Error("Dataset not found");
  }

  const context = {
    datasetMeta: record.meta,
    charts: record.dashboardState.charts.map((chart) => ({
      id: chart.id,
      spec: chart.spec,
    })),
    aggregates: {
      numericStats: record.meta.numericStats,
      topCategoricalValues: record.meta.topCategoricalValues,
      dateRanges: record.meta.dateRanges,
    },
    message: input.message,
  };

  let assistantMessage =
    "I can only apply limited updates right now, but your dashboard is still available.";
  let actions: Array<unknown> = [];

  try {
    const response = await chatActions(context);
    const parsed = LLMChatResponseSchema.safeParse(response);
    if (parsed.success) {
      assistantMessage = parsed.data.assistantMessage;
      actions = parsed.data.actions;
    }
  } catch {
    actions = [];
  }

  let nextCharts = [...record.dashboardState.charts];
  let nextHidden = [...record.dashboardState.hiddenChartIds];
  let hasChanges = false;

  for (const action of actions) {
    const parsed = LLMChatResponseSchema.shape.actions.element.safeParse(action);
    if (!parsed.success) {
      continue;
    }
    const data = parsed.data;
    if (data.type === "remove_chart") {
      if (!nextHidden.includes(data.chartId)) {
        nextHidden = [...nextHidden, data.chartId];
        hasChanges = true;
      }
      continue;
    }
    if (data.type === "show_chart") {
      const filtered = nextHidden.filter((id) => id !== data.chartId);
      if (filtered.length !== nextHidden.length) {
        nextHidden = filtered;
        hasChanges = true;
      }
      continue;
    }
    if (data.type === "add_chart") {
      const chartSpec = ChartSpecSchema.parse(data.chart);
      nextCharts = [
        ...nextCharts,
        {
          id: chartSpec.id,
          spec: chartSpec,
          payload: buildChartPayload(chartSpec, record.normalizedRows),
        },
      ];
      hasChanges = true;
      continue;
    }
    if (data.type === "update_chart") {
      let updated = false;
      nextCharts = nextCharts.map((chart) => {
        if (chart.id !== data.chartId) {
          return chart;
        }
        updated = true;
        const nextSpec = ChartSpecSchema.parse({
          ...chart.spec,
          ...data.patch,
          id: chart.spec.id,
        });
        return {
          ...chart,
          spec: nextSpec,
          payload: buildChartPayload(nextSpec, record.normalizedRows),
        };
      });
      if (updated) {
        hasChanges = true;
      }
    }
  }

  if (!hasChanges) {
    return {
      assistantMessage,
      dashboardState: record.dashboardState,
    };
  }

  const profile = profileDataset(record.normalizedRows, record.debug);
  const rawCharts = nextCharts.map((chart) => ({
    id: chart.id,
    spec: chart.spec,
    payload: buildChartPayload(chart.spec, record.normalizedRows),
  }));
  const charts = applyChartQuality(rawCharts, record.normalizedRows, profile);
  const chartIds = new Set(charts.map((chart) => chart.id));
  const cleanedHidden = nextHidden.filter((id) => chartIds.has(id));

  const updated = updateDashboardState(input.datasetId, {
    datasetId: record.dashboardState.datasetId,
    datasetTopic: record.dashboardState.datasetTopic,
    datasetMeta: record.dashboardState.datasetMeta,
    charts,
    hiddenChartIds: cleanedHidden,
  });

  return {
    assistantMessage,
    dashboardState: updated,
  };
}
