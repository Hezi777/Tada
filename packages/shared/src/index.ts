import { z } from "zod";

export const HealthSchema = z.object({
  ok: z.boolean(),
});

export type HealthResponse = z.infer<typeof HealthSchema>;

export const ColumnKindSchema = z.enum([
  "numeric",
  "categorical",
  "date",
  "ignored",
]);
export type ColumnKind = z.infer<typeof ColumnKindSchema>;

export const DashboardColumnSchema = z.object({
  name: z.string().min(1),
  kind: ColumnKindSchema,
});
export type DashboardColumn = z.infer<typeof DashboardColumnSchema>;

export const DatasetMetaSchema = z.object({
  columns: z.array(DashboardColumnSchema),
  rowCount: z.number().int().nonnegative(),
  sampleRows: z.array(z.record(z.unknown())),
});
export type DatasetMeta = z.infer<typeof DatasetMetaSchema>;

export const SerializedValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
]);
export type SerializedValue = z.infer<typeof SerializedValueSchema>;

export const SerializedRowSchema = z.record(SerializedValueSchema);
export type SerializedRow = z.infer<typeof SerializedRowSchema>;

export const LoadedDatasetFileSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  rowCount: z.number().int().nonnegative(),
  isPrimary: z.boolean(),
});
export type LoadedDatasetFile = z.infer<typeof LoadedDatasetFileSchema>;

export const ChartTypeSchema = z.enum([
  "area",
  "bar",
  "donut",
  "scatter",
  "kpi",
]);
export type ChartType = z.infer<typeof ChartTypeSchema>;

export const ChartAggregationSchema = z.enum([
  "sum",
  "avg",
  "count",
  "min",
  "max",
]);
export type ChartAggregation = z.infer<typeof ChartAggregationSchema>;

export const ChartSizeSchema = z.enum(["small", "medium", "large"]);
export type ChartSize = z.infer<typeof ChartSizeSchema>;

export const ChartSourceSchema = z.enum([
  "ai_initial",
  "chatbot",
  "user",
  "fallback",
]);
export type ChartSource = z.infer<typeof ChartSourceSchema>;

export const ChartConfigSchema = z.object({
  id: z.string().min(1),
  type: ChartTypeSchema,
  title: z.string().min(1),
  insight: z.string().min(1),
  columns: z.array(z.string().min(1)),
  aggregation: ChartAggregationSchema.nullable(),
  groupBy: z.string().min(1).nullable(),
  timeColumn: z.string().min(1).nullable(),
  size: ChartSizeSchema,
  visible: z.boolean(),
  order: z.number().int().nonnegative(),
  source: ChartSourceSchema,
  chatbotGenerated: z.boolean(),
  generatedAt: z.string().datetime(),
});
export type ChartConfig = z.infer<typeof ChartConfigSchema>;

export const KPIConfigSchema = z.object({
  id: z.string().min(1),
  column: z.string().min(1),
  aggregation: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  isPrimary: z.boolean(),
});
export type KPIConfig = z.infer<typeof KPIConfigSchema>;

export const ChatKpiValueSchema = z.object({
  id: z.string().min(1),
  column: z.string().min(1),
  aggregation: z.string().min(1),
  label: z.string().min(1),
  isPrimary: z.boolean(),
  value: SerializedValueSchema,
});
export type ChatKpiValue = z.infer<typeof ChatKpiValueSchema>;

export const DashboardConfigSnapshotSchema = z.object({
  datasetId: z.string().min(1),
  version: z.number().int().positive(),
  columns: z.array(DashboardColumnSchema),
  datasetMeta: DatasetMetaSchema.optional(),
  charts: z.array(ChartConfigSchema),
  kpis: z.array(KPIConfigSchema),
});
export type DashboardConfigSnapshot = z.infer<
  typeof DashboardConfigSnapshotSchema
>;

export const ChatbotChartPatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("add"),
    config: ChartConfigSchema,
    chartId: z.string().min(1).optional(),
  }),
  z.object({
    action: z.literal("remove"),
    chartId: z.string().min(1),
    config: ChartConfigSchema.optional(),
  }),
  z.object({
    action: z.literal("update"),
    chartId: z.string().min(1),
    config: ChartConfigSchema.partial(),
  }),
]);
export type ChatbotChartPatch = z.infer<typeof ChatbotChartPatchSchema>;

export const UploadDashboardResponseSchema =
  DashboardConfigSnapshotSchema.extend({
    fileName: z.string().min(1),
    rows: z.array(SerializedRowSchema),
    files: z.array(LoadedDatasetFileSchema),
  });
export type UploadDashboardResponse = z.infer<
  typeof UploadDashboardResponseSchema
>;

export const DeleteChainedFileRequestSchema = z.object({
  datasetId: z.string().min(1),
  fileId: z.string().min(1),
});
export type DeleteChainedFileRequest = z.infer<
  typeof DeleteChainedFileRequestSchema
>;

export const ChatDashboardRequestSchema = z.object({
  datasetId: z.string().min(1),
  message: z.string().min(1),
  chartConfigs: z.array(ChartConfigSchema),
  kpis: z.array(ChatKpiValueSchema),
});
export type ChatDashboardRequest = z.infer<typeof ChatDashboardRequestSchema>;

export const ChatDashboardResponseSchema = z.object({
  assistantMessage: z.string(),
  patch: ChatbotChartPatchSchema.nullable(),
});
export type ChatDashboardResponse = z.infer<typeof ChatDashboardResponseSchema>;

export const BI_RULE_LIMITS = {
  minCharts: 2,
  maxCharts: 6,
  minKpis: 2,
  maxKpis: 4,
  maxDonutSegments: 6,
  minScatterPoints: 5,
  minScatterCorrelation: 0.35,
} as const;

export const BI_GENERATION_RULES = [
  "Max 6 charts total, min 2.",
  "No two charts of the same type on the same column set.",
  "Area charts require a valid date or time column.",
  "Donut charts must show at most 6 segments and group the remainder as Other.",
  "The highest-priority insight must remain at order 0.",
  "Chart titles must be specific and human-readable; insights must never be empty.",
  "Scatter charts require two numeric columns with meaningful correlation.",
  "The primary KPI must come from the highest-variance or most business-relevant column.",
  "Chatbot patches must be validated before they are applied.",
  "Every generated config must include generatedAt and source for auditability.",
  "Never generate a chart where all values in the target column are identical; zero-variance visuals are meaningless.",
  "Time series charts are allowed only when a date or datetime column exists and has at least 3 distinct values.",
  "Scatter charts are allowed only when two numeric columns exist and both have distinct value ranges.",
  "Prefer bar charts for categorical columns with 2 to 15 unique values; if a categorical column has more than 15 unique values, choose a different chart type.",
  "Every chart title must reference the actual column name or names shown in the chart.",
  "Every insight string must include a specific value or finding, not a generic description.",
] as const;

// ── Multi-Dashboard ──

export const DASHBOARD_ICON_OPTIONS = [
  "bar-chart",
  "pie-chart",
  "trending-up",
  "store",
  "shopping-cart",
  "users",
  "activity",
  "target",
  "zap",
  "layers",
] as const;

export const DASHBOARD_COLOR_OPTIONS = [
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#8B5CF6",
  "#EC4899",
  "#EF4444",
  "#06B6D4",
  "#84CC16",
] as const;

export const DashboardListItemSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  icon: z.string(),
  color: z.string(),
  fileCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DashboardListItem = z.infer<typeof DashboardListItemSchema>;

export const CreateDashboardRequestSchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1),
  color: z.string().min(1),
  datasetIds: z.array(z.string()).optional(),
});
export type CreateDashboardRequest = z.infer<
  typeof CreateDashboardRequestSchema
>;

export const UpdateDashboardRequestSchema = z.object({
  name: z.string().min(1).optional(),
  icon: z.string().min(1).optional(),
  color: z.string().min(1).optional(),
});
export type UpdateDashboardRequest = z.infer<
  typeof UpdateDashboardRequestSchema
>;
