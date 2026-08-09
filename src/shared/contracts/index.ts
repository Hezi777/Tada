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

// Discrete widget size classes with fixed grid geometry (docs/WIDGET_SIZING.md):
// small 1×1, medium 2×1, large 2×2, xlarge 4×2 cells. A widget renders a
// different view per class; it never scales or measures its container.
export const ChartSizeSchema = z.enum(["small", "medium", "large", "xlarge"]);
export type ChartSize = z.infer<typeof ChartSizeSchema>;

export const SIZE_CLASS_ORDER = ChartSizeSchema.options;

/** Which size classes each widget type offers. A type with no honest
 * rendering at a class does not support it — the size-control stop is
 * disabled, never faked with a fallback rendering. */
export const WIDGET_SIZE_SUPPORT: Record<
  "kpi" | ChartType,
  readonly ChartSize[]
> = {
  kpi: ["small", "medium", "large"],
  bar: ["small", "medium", "large", "xlarge"],
  area: ["small", "medium", "large", "xlarge"],
  donut: ["medium", "large"],
  scatter: ["large", "xlarge"],
};

export function supportsSize(
  type: "kpi" | ChartType,
  size: ChartSize,
): boolean {
  return WIDGET_SIZE_SUPPORT[type].includes(size);
}

/** Nearest supported class by distance in the size order, ties broken
 * toward the smaller class (e.g. donut small→medium, scatter medium→large). */
export function clampToSupportedSize(
  type: "kpi" | ChartType,
  size: ChartSize,
): ChartSize {
  const supported = WIDGET_SIZE_SUPPORT[type];
  if (supported.includes(size)) {
    return size;
  }
  const index = SIZE_CLASS_ORDER.indexOf(size);
  let best = supported[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of supported) {
    const distance = Math.abs(SIZE_CLASS_ORDER.indexOf(candidate) - index);
    if (
      distance < bestDistance ||
      (distance === bestDistance &&
        SIZE_CLASS_ORDER.indexOf(candidate) < SIZE_CLASS_ORDER.indexOf(best))
    ) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

export const ChartSourceSchema = z.enum([
  "ai_initial",
  "chatbot",
  "user",
  "fallback",
]);
export type ChartSource = z.infer<typeof ChartSourceSchema>;

export const ChartLastTouchedBySchema = z.enum([
  "ai_initial",
  "chatbot",
  "user",
]);
export type ChartLastTouchedBy = z.infer<typeof ChartLastTouchedBySchema>;

export const ChartVisibilityStateSchema = z.enum(["visible", "hidden"]);
export type ChartVisibilityState = z.infer<typeof ChartVisibilityStateSchema>;

export const ChartEvidenceSchema = z.object({
  description: z.string().min(1),
  includedRowCount: z.number().int().nonnegative(),
  excludedRowCount: z.number().int().nonnegative(),
  values: z.record(z.union([z.string(), z.number(), z.null()])),
});
export type ChartEvidence = z.infer<typeof ChartEvidenceSchema>;

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
  visible: z.boolean().default(true),
  order: z.number().int().nonnegative(),
  source: ChartSourceSchema,
  chatbotGenerated: z.boolean().default(false),
  generatedAt: z.string().datetime(),
  pinned: z.boolean().default(false),
  priority: z.number().int().nonnegative().default(0),
  lastTouchedBy: ChartLastTouchedBySchema.default("user"),
  visibilityState: ChartVisibilityStateSchema.default("visible"),
  // Render hints set by the BI rules engine.
  orientation: z.enum(["vertical", "horizontal"]).optional(),
  categoryLimit: z.number().int().positive().optional(),
  // Deterministic inputs behind heuristic insights. Optional for persisted
  // charts created before evidence tracking and for LLM-generated charts.
  evidence: ChartEvidenceSchema.optional(),
});
export type ChartConfig = z.infer<typeof ChartConfigSchema>;

export function deriveChartLastTouchedBy(
  source: ChartSource,
): ChartLastTouchedBy {
  if (source === "chatbot") {
    return "chatbot";
  }
  if (source === "user") {
    return "user";
  }
  return "ai_initial";
}

export function normalizeChartConfig(
  chart: Omit<
    ChartConfig,
    "pinned" | "priority" | "lastTouchedBy" | "visibilityState"
  > &
    Partial<
      Pick<
        ChartConfig,
        "pinned" | "priority" | "lastTouchedBy" | "visibilityState"
      >
    >,
): ChartConfig {
  const visible = chart.visibilityState
    ? chart.visibilityState === "visible"
    : chart.visible;

  return {
    ...chart,
    visible,
    size: clampToSupportedSize(chart.type, chart.size),
    pinned: chart.pinned ?? false,
    priority: chart.priority ?? chart.order,
    lastTouchedBy:
      chart.lastTouchedBy ?? deriveChartLastTouchedBy(chart.source),
    visibilityState: chart.visibilityState ?? (visible ? "visible" : "hidden"),
  };
}

export const KPIConfigSchema = z.object({
  id: z.string().min(1),
  column: z.string().min(1),
  aggregation: z.string().min(1),
  label: z.string().min(1),
  description: z.string().min(1),
  isPrimary: z.boolean(),
  // Apple-widget geometry: size preset + order in the unified widget list.
  size: ChartSizeSchema.default("medium"),
  order: z.number().int().nonnegative().default(0),
});
export type KPIConfig = z.infer<typeof KPIConfigSchema>;

/** Backfill `size`/`order` for KPI configs persisted before the
 * Apple-widget canvas (geometry now lives in these two fields only). */
export function normalizeKpiConfig(
  kpi: Omit<KPIConfig, "size" | "order"> &
    Partial<Pick<KPIConfig, "size" | "order">>,
  index = 0,
): KPIConfig {
  return {
    ...kpi,
    size: clampToSupportedSize("kpi", kpi.size ?? "medium"),
    order: kpi.order ?? index,
  };
}

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

export const ChatChartProposalSchema = z.object({
  type: z.enum(["replace_chart", "show_hidden_chart"]),
  targetChartId: z.string().min(1).nullable(),
  targetChartTitle: z.string().min(1).nullable(),
  incomingConfig: ChartConfigSchema,
  reason: z.string().min(1),
});
export type ChatChartProposal = z.infer<typeof ChatChartProposalSchema>;

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
  focusChartId: z.string().min(1).optional(),
});
export type ChatDashboardRequest = z.infer<typeof ChatDashboardRequestSchema>;

export const ChatDashboardResponseSchema = z.object({
  assistantMessage: z.string(),
  mode: z.enum(["answer", "apply_patch", "proposal"]),
  patch: ChatbotChartPatchSchema.nullable(),
  proposal: ChatChartProposalSchema.nullable(),
});
export type ChatDashboardResponse = z.infer<typeof ChatDashboardResponseSchema>;

// ── BI Rules RAG ──

export const BiRuleCategorySchema = z.enum([
  "chart_selection",
  "formatting",
  "aggregation",
  "readability",
  "israeli_data",
]);
export type BiRuleCategory = z.infer<typeof BiRuleCategorySchema>;

export const BiRuleSeveritySchema = z.enum(["error", "warning", "info"]);
export type BiRuleSeverity = z.infer<typeof BiRuleSeveritySchema>;

export const BiRuleSchema = z.object({
  rule_id: z.string().min(1),
  category: BiRuleCategorySchema,
  content: z.string().min(1),
  action_if_fail: z.string().min(1),
  severity: BiRuleSeveritySchema,
});
export type BiRule = z.infer<typeof BiRuleSchema>;

export const RuleViolationSchema = z.object({
  ruleId: z.string().min(1),
  chartId: z.string().min(1),
  action: z.string().min(1),
  severity: BiRuleSeveritySchema,
  applied: z.boolean(),
  detail: z.string(),
});
export type RuleViolation = z.infer<typeof RuleViolationSchema>;

// ── Dataset topics ──

export const DATASET_TOPICS = [
  "cash_flow",
  "sales",
  "expenses",
  "student_grades",
  "customer_feedback",
  "hr",
  "inventory",
  "marketing",
  "unknown",
] as const;

export const DatasetTopicSchema = z.enum(DATASET_TOPICS);
export type DatasetTopic = z.infer<typeof DatasetTopicSchema>;

export const DATASET_TOPIC_LABELS: Record<
  DatasetTopic,
  { en: string; he: string }
> = {
  cash_flow: { en: "Cash flow", he: "תזרים מזומנים" },
  sales: { en: "Sales", he: "מכירות" },
  expenses: { en: "Expenses", he: "הוצאות" },
  student_grades: { en: "Student grades", he: "ציוני תלמידים" },
  customer_feedback: { en: "Customer feedback", he: "משוב לקוחות" },
  hr: { en: "HR / People", he: "משאבי אנוש" },
  inventory: { en: "Inventory", he: "מלאי" },
  marketing: { en: "Marketing", he: "שיווק" },
  unknown: { en: "Not sure / Other", he: "לא בטוח / אחר" },
};

// ── Dataset profiling (pure TS, no LLM) ──

export const ColumnProfileSchema = z.object({
  name: z.string().min(1),
  kind: ColumnKindSchema,
  nullCount: z.number().int().nonnegative(),
  uniqueCount: z.number().int().nonnegative(),
  min: z.union([z.string(), z.number()]).nullable(),
  max: z.union([z.string(), z.number()]).nullable(),
  mean: z.number().nullable(),
  topValues: z.array(
    z.object({ value: SerializedValueSchema, count: z.number().int() }),
  ),
  isPii: z.boolean(),
  invalidCount: z.number().int().nonnegative().default(0),
  semanticType: z
    .enum(["currency", "percentage", "rate", "quantity", "duration"])
    .nullable()
    .default(null),
  unit: z.string().min(1).nullable().default(null),
});
export type ColumnProfile = z.infer<typeof ColumnProfileSchema>;

export const DatasetProfileSchema = z.object({
  rowCount: z.number().int().nonnegative(),
  columnCount: z.number().int().nonnegative(),
  columns: z.array(ColumnProfileSchema),
  piiColumns: z.array(z.string()),
  invalidDateRowCount: z.number().int().nonnegative().default(0),
  incompleteRowCount: z.number().int().nonnegative().default(0),
});
export type DatasetProfile = z.infer<typeof DatasetProfileSchema>;

export const UploadProfileResponseSchema = z.object({
  datasetId: z.string().min(1),
  fileName: z.string().min(1),
  rowCount: z.number().int().nonnegative(),
  columns: z.array(DashboardColumnSchema),
  profile: DatasetProfileSchema,
  suggestedTopic: DatasetTopicSchema,
});
export type UploadProfileResponse = z.infer<typeof UploadProfileResponseSchema>;

export const GenerateDashboardRequestSchema = z.object({
  datasetId: z.string().min(1),
  topic: DatasetTopicSchema,
  chartCount: z.number().int().min(2).max(6),
});
export type GenerateDashboardRequest = z.infer<
  typeof GenerateDashboardRequestSchema
>;

export const BI_RULE_LIMITS = {
  minCharts: 2,
  maxCharts: 6,
  maxSavedCharts: 12,
  minKpis: 2,
  maxKpis: 4,
  maxDonutSegments: 6,
  minScatterPoints: 5,
  minScatterCorrelation: 0.35,
} as const;

export const BI_GENERATION_RULES = [
  "Max 6 visible charts on the canvas and up to 12 saved charts total.",
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
  "#f0fff4",
  "#fff0f0",
  "#f0f4ff",
  "#f5f0ff",
  "#fffbf0",
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
