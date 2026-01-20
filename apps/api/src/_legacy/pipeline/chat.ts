import type { ChartPayload, ChartSpec, DashboardChart } from "@tada/shared";
import { LLMChatResponseSchema } from "@tada/shared";
import type { NormalizedRow } from "../state-store";
import { chatActions } from "../legacy/llm/hf-client";
import { getDatasetRecord, updateDashboardState } from "../state-store";

type Command =
  | { type: "remove"; target: string }
  | { type: "show"; target: string }
  | { type: "rename"; target: string; title: string }
  | { type: "change_type"; target: string; chartType: ChartSpec["type"] };

const TOP_VALUES_LIMIT = 10;
const BIN_COUNT = 10;
const TABLE_LIMIT = 15;

function normalizeTarget(input: string): string {
  return input.trim().toLowerCase();
}

function chartMatchesTarget(chart: DashboardChart, target: string, index: number): boolean {
  const normalized = normalizeTarget(target);
  if (chart.id.toLowerCase() === normalized) {
    return true;
  }
  const number = Number(normalized);
  if (Number.isFinite(number) && number >= 1) {
    return index + 1 === number;
  }
  if (chart.spec.title.toLowerCase() === normalized) {
    return true;
  }
  return false;
}

function parseCommands(message: string): Command[] {
  const text = message.trim();
  const lower = text.toLowerCase();
  const commands: Command[] = [];

  const removeMatch = lower.match(/(?:remove|hide)\s+chart\s+(.+)$/i);
  if (removeMatch) {
    commands.push({ type: "remove", target: removeMatch[1].trim() });
    return commands;
  }

  const showMatch = lower.match(/show\s+chart\s+(.+)$/i);
  if (showMatch) {
    commands.push({ type: "show", target: showMatch[1].trim() });
    return commands;
  }

  const renameMatch = text.match(/rename\s+chart\s+(.+?)\s+to\s+(.+)$/i);
  if (renameMatch) {
    commands.push({
      type: "rename",
      target: renameMatch[1].trim(),
      title: renameMatch[2].trim(),
    });
    return commands;
  }

  const changeMatch = lower.match(
    /(?:change|set)\s+chart\s+(.+?)\s+(?:to|type)\s+(line|bar|pie|table)\b/i
  );
  if (changeMatch) {
    commands.push({
      type: "change_type",
      target: changeMatch[1].trim(),
      chartType: changeMatch[2].toLowerCase() as ChartSpec["type"],
    });
  }

  return commands;
}

function commandsFromLLM(actions: unknown[]): Command[] {
  const commands: Command[] = [];
  for (const action of actions) {
    const parsed = LLMChatResponseSchema.shape.actions.element.safeParse(action);
    if (!parsed.success) {
      continue;
    }
    const data = parsed.data;
    if (data.type === "remove_chart") {
      commands.push({ type: "remove", target: data.chartId });
      continue;
    }
    if (data.type === "show_chart") {
      commands.push({ type: "show", target: data.chartId });
      continue;
    }
    if (data.type === "update_chart") {
      if (typeof data.patch.title === "string") {
        commands.push({ type: "rename", target: data.chartId, title: data.patch.title });
      }
      if (data.patch.type) {
        commands.push({ type: "change_type", target: data.chartId, chartType: data.patch.type });
      }
    }
  }
  return commands;
}

function normalizeCategory(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Unknown";
  }
  return String(value);
}

function buildTablePayload(rows: NormalizedRow[], columns: string[]): ChartPayload {
  const data = rows.slice(0, TABLE_LIMIT).map((row) => {
    const next: Record<string, unknown> = {};
    for (const column of columns) {
      next[column] = row[column] ?? null;
    }
    return next;
  });
  return { columns, rows: data };
}

function buildCategoricalPayload(
  rows: NormalizedRow[],
  xKey: string,
  yKey: string | undefined,
  aggregation: "sum" | "avg" | "count"
): ChartPayload {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    const xValue = normalizeCategory(row[xKey]);
    const entry = totals.get(xValue) ?? { sum: 0, count: 0 };
    if (aggregation === "count" || !yKey) {
      entry.count += 1;
    } else {
      const yValue = row[yKey];
      if (typeof yValue === "number") {
        entry.sum += yValue;
        entry.count += 1;
      }
    }
    totals.set(xValue, entry);
  }

  const values = Array.from(totals.entries()).map(([x, entry]) => {
    const value =
      aggregation === "avg"
        ? entry.count
          ? entry.sum / entry.count
          : 0
        : aggregation === "sum"
          ? entry.sum
          : entry.count;
    return [x, value] as const;
  });

  const sorted = values.sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, TOP_VALUES_LIMIT);
  const remainder = sorted.slice(TOP_VALUES_LIMIT);
  if (remainder.length) {
    const otherSum = remainder.reduce((sum, [, value]) => sum + value, 0);
    top.push(["Other", otherSum]);
  }

  const data = top.map(([x, y]) => ({ x, y }));
  return { data, xKey: "x", yKey: "y" };
}

function buildDistributionPayload(values: number[]): ChartPayload {
  if (!values.length) {
    return { data: [], xKey: "x", yKey: "y" };
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return { data: [{ x: String(min), y: values.length }], xKey: "x", yKey: "y" };
  }
  const step = (max - min) / BIN_COUNT;
  const bins = Array.from({ length: BIN_COUNT }, (_, index) => ({
    start: min + step * index,
    end: index === BIN_COUNT - 1 ? max : min + step * (index + 1),
    count: 0,
  }));
  for (const value of values) {
    const position = Math.min(Math.floor((value - min) / step), BIN_COUNT - 1);
    bins[position].count += 1;
  }
  const data = bins.map((bin) => ({
    x: `${bin.start.toFixed(2)}-${bin.end.toFixed(2)}`,
    y: bin.count,
  }));
  return { data, xKey: "x", yKey: "y" };
}

function buildTimeSeriesPayload(
  rows: NormalizedRow[],
  xKey: string,
  yKey: string | undefined,
  aggregation: "sum" | "avg" | "count"
): ChartPayload {
  const timestamps = rows
    .map((row) => row[xKey])
    .filter((value): value is number => typeof value === "number");
  if (!timestamps.length) {
    return { data: [], xKey: "x", yKey: "y" };
  }
  const min = Math.min(...timestamps);
  const max = Math.max(...timestamps);
  const spanDays = (max - min) / (1000 * 60 * 60 * 24);
  const bucket = spanDays > 365 ? "month" : "day";
  const totals = new Map<number, { sum: number; count: number }>();

  for (const row of rows) {
    const raw = row[xKey];
    if (typeof raw !== "number") {
      continue;
    }
    const date = new Date(raw);
    const bucketDate =
      bucket === "month"
        ? new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
        : new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const key = bucketDate.getTime();
    const entry = totals.get(key) ?? { sum: 0, count: 0 };
    if (aggregation === "count" || !yKey) {
      entry.count += 1;
    } else {
      const yValue = row[yKey];
      if (typeof yValue === "number") {
        entry.sum += yValue;
        entry.count += 1;
      }
    }
    totals.set(key, entry);
  }

  const data = Array.from(totals.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([x, entry]) => {
      const value =
        aggregation === "avg"
          ? entry.count
            ? entry.sum / entry.count
            : 0
          : aggregation === "sum"
            ? entry.sum
            : entry.count;
      return { x, y: value };
    });
  return { data, xKey: "x", yKey: "y" };
}

function buildPayloadForSpec(rows: NormalizedRow[], spec: ChartSpec): ChartPayload {
  if (spec.type === "table") {
    const columns = [spec.x, spec.y].filter(Boolean) as string[];
    return buildTablePayload(rows, columns);
  }
  if (spec.type === "line") {
    const aggregation = spec.aggregation ?? (spec.y ? "sum" : "count");
    return buildTimeSeriesPayload(rows, spec.x, spec.y, aggregation);
  }
  if (spec.type === "bar" || spec.type === "pie") {
    const aggregation = spec.aggregation ?? (spec.y ? "sum" : "count");
    const numericValues = rows
      .map((row) => row[spec.x])
      .filter((value): value is number => typeof value === "number");
    if (spec.type === "bar" && aggregation === "count" && numericValues.length) {
      return buildDistributionPayload(numericValues);
    }
    return buildCategoricalPayload(rows, spec.x, spec.y, aggregation);
  }
  return { data: [], xKey: "x", yKey: "y" };
}

export async function handleChat(input: {
  datasetId: string;
  message: string;
  dashboardVersion: number;
}) {
  const record = getDatasetRecord(input.datasetId);
  if (!record) {
    throw new Error("Dataset not found");
  }

  const commands = parseCommands(input.message);
  let appliedCommands = commands;
  let assistantMessage =
    "Supported commands: remove chart <id|number>, show chart <id|number>, rename chart <id|number> to <title>, change chart <id|number> to <line|bar|pie|table>.";

  if (appliedCommands.length === 0) {
    try {
      const response = await chatActions({
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
      });
      appliedCommands = commandsFromLLM(response.actions);
      if (appliedCommands.length > 0) {
        assistantMessage = response.assistantMessage;
      }
    } catch {
      appliedCommands = [];
    }
  }

  if (appliedCommands.length === 0) {
    return { assistantMessage, dashboardState: record.dashboardState };
  }

  let nextCharts = record.dashboardState.charts.map((chart) => ({ ...chart }));
  let nextHidden = [...record.dashboardState.hiddenChartIds];
  const changes: string[] = [];

  for (const command of appliedCommands) {
    const index = nextCharts.findIndex((chart, chartIndex) =>
      chartMatchesTarget(chart, command.target, chartIndex)
    );
    if (index === -1) {
      continue;
    }
    const chart = nextCharts[index];

    if (command.type === "remove") {
      if (!nextHidden.includes(chart.id)) {
        nextHidden = [...nextHidden, chart.id];
        changes.push(`hid ${chart.id}`);
      }
      continue;
    }
    if (command.type === "show") {
      const filtered = nextHidden.filter((id) => id !== chart.id);
      if (filtered.length !== nextHidden.length) {
        nextHidden = filtered;
        changes.push(`showed ${chart.id}`);
      }
      continue;
    }
    if (command.type === "rename") {
      const updated: DashboardChart = {
        ...chart,
        spec: { ...chart.spec, title: command.title },
      };
      nextCharts = nextCharts.map((item, idx) => (idx === index ? updated : item));
      changes.push(`renamed ${chart.id}`);
      continue;
    }
    if (command.type === "change_type") {
      const updatedSpec: ChartSpec = {
        ...chart.spec,
        type: command.chartType,
      };
      const payload = buildPayloadForSpec(record.normalizedRows, updatedSpec);
      const updated: DashboardChart = {
        ...chart,
        spec: updatedSpec,
        payload,
      };
      nextCharts = nextCharts.map((item, idx) => (idx === index ? updated : item));
      changes.push(`changed ${chart.id} to ${command.chartType}`);
    }
  }

  if (changes.length === 0) {
    return {
      assistantMessage: "No matching charts found for that command.",
      dashboardState: record.dashboardState,
    };
  }

  const updated = updateDashboardState(input.datasetId, {
    datasetId: record.dashboardState.datasetId,
    datasetTopic: record.dashboardState.datasetTopic,
    datasetMeta: record.dashboardState.datasetMeta,
    charts: nextCharts,
    hiddenChartIds: nextHidden,
  });

  return {
    assistantMessage:
      appliedCommands === commands
        ? `Updated dashboard: ${changes.join(", ")}.`
        : assistantMessage,
    dashboardState: updated,
  };
}
