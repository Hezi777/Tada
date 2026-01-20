import { z } from "zod";

export const HealthSchema = z.object({
  ok: z.boolean(),
});

export type HealthResponse = z.infer<typeof HealthSchema>;

export const ColumnTypeSchema = z.enum(["metric", "dimension", "date", "categorical"]);
export type ColumnType = z.infer<typeof ColumnTypeSchema>;

export const ColumnMetaSchema = z.object({
  name: z.string(),
  type: ColumnTypeSchema,
});
export type ColumnMeta = z.infer<typeof ColumnMetaSchema>;

export const NumericStatsSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
  mean: z.number().nullable(),
  median: z.number().nullable(),
});
export type NumericStats = z.infer<typeof NumericStatsSchema>;

export const CategoricalTopValueSchema = z.object({
  value: z.string(),
  count: z.number(),
});
export type CategoricalTopValue = z.infer<typeof CategoricalTopValueSchema>;

export const DateRangeSchema = z.object({
  min: z.number().nullable(),
  max: z.number().nullable(),
});
export type DateRange = z.infer<typeof DateRangeSchema>;

export const DatasetMetaSchema = z.object({
  columns: z.array(ColumnMetaSchema),
  rowCount: z.number(),
  sampleRows: z.array(z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))),
  numericStats: z.record(NumericStatsSchema),
  topCategoricalValues: z.record(z.array(CategoricalTopValueSchema)),
  dateRanges: z.record(DateRangeSchema),
});
export type DatasetMeta = z.infer<typeof DatasetMetaSchema>;

export const ChartTypeSchema = z.enum(["line", "bar", "pie", "table"]);
export type ChartType = z.infer<typeof ChartTypeSchema>;

export const ColorIntentSchema = z.enum([
  "categorical",
  "time",
  "distribution",
  "focus",
]);
export type ColorIntent = z.infer<typeof ColorIntentSchema>;

export const ChartSpecSchema = z.object({
  id: z.string(),
  type: ChartTypeSchema,
  x: z.string(),
  y: z.string().optional(),
  title: z.string(),
  filters: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
  colorIntent: ColorIntentSchema,
  aggregation: z.enum(["sum", "avg", "count"]).optional(),
});
export type ChartSpec = z.infer<typeof ChartSpecSchema>;

export const ChartPayloadSchema = z.record(z.any());
export type ChartPayload = z.infer<typeof ChartPayloadSchema>;

export const DashboardChartSchema = z.object({
  id: z.string(),
  spec: ChartSpecSchema,
  payload: ChartPayloadSchema,
});
export type DashboardChart = z.infer<typeof DashboardChartSchema>;

export const DashboardStateSchema = z.object({
  version: z.number(),
  datasetId: z.string(),
  datasetTopic: z.string(),
  datasetMeta: DatasetMetaSchema,
  charts: z.array(DashboardChartSchema),
  hiddenChartIds: z.array(z.string()),
});
export type DashboardState = z.infer<typeof DashboardStateSchema>;

export const LLMPlanResponseSchema = z.object({
  datasetTopic: z.string(),
  metrics: z.array(z.string()),
  dimensions: z.array(z.string()),
  charts: z.array(ChartSpecSchema).min(3).max(5),
});
export type LLMPlanResponse = z.infer<typeof LLMPlanResponseSchema>;

export const ChatActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("remove_chart"),
    chartId: z.string(),
  }),
  z.object({
    type: z.literal("add_chart"),
    chart: ChartSpecSchema,
  }),
  z.object({
    type: z.literal("update_chart"),
    chartId: z.string(),
    patch: ChartSpecSchema.partial(),
  }),
  z.object({
    type: z.literal("show_chart"),
    chartId: z.string(),
  }),
]);
export type ChatAction = z.infer<typeof ChatActionSchema>;

export const LLMChatResponseSchema = z.object({
  assistantMessage: z.string(),
  actions: z.array(ChatActionSchema),
});
export type LLMChatResponse = z.infer<typeof LLMChatResponseSchema>;
