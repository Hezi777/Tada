import type { ChartSpec, DatasetMeta } from "@tada/shared";

function pickColumn(
  meta: DatasetMeta,
  type: "metric" | "date" | "categorical" | "dimension"
): string | null {
  return meta.columns.find((col) => col.type === type)?.name ?? null;
}

export function buildFallbackCharts(meta: DatasetMeta): ChartSpec[] {
  const charts: ChartSpec[] = [];
  const metric = pickColumn(meta, "metric");
  const date = pickColumn(meta, "date");
  const categorical = pickColumn(meta, "categorical") ?? pickColumn(meta, "dimension");
  const durationMinutes = meta.columns.find((col) => col.name === "duration_minutes")?.name ?? null;
  const seasonsCount = meta.columns.find((col) => col.name === "seasons_count")?.name ?? null;

  if (date) {
    charts.push({
      id: "chart_1",
      type: "line",
      x: date,
      y: metric ?? undefined,
      title: metric ? `${metric} over time` : `${date} trend`,
      colorIntent: "time",
    });
  }

  if (categorical) {
    charts.push({
      id: charts.length ? `chart_${charts.length + 1}` : "chart_1",
      type: "bar",
      x: categorical,
      y: metric ?? undefined,
      title: metric ? `${metric} by ${categorical}` : `${categorical} breakdown`,
      colorIntent: "categorical",
    });
    charts.push({
      id: charts.length ? `chart_${charts.length + 1}` : "chart_1",
      type: "pie",
      x: categorical,
      y: metric ?? undefined,
      title: `${categorical} share`,
      colorIntent: "distribution",
    });
  }

  if (durationMinutes) {
    charts.push({
      id: charts.length ? `chart_${charts.length + 1}` : "chart_1",
      type: "bar",
      x: durationMinutes,
      title: "Movie duration distribution",
      colorIntent: "distribution",
    });
  }

  if (seasonsCount) {
    charts.push({
      id: charts.length ? `chart_${charts.length + 1}` : "chart_1",
      type: "bar",
      x: seasonsCount,
      title: "TV seasons distribution",
      colorIntent: "distribution",
    });
  }

  if (metric && !date && !categorical) {
    charts.push({
      id: charts.length ? `chart_${charts.length + 1}` : "chart_1",
      type: "bar",
      x: metric,
      title: `${metric} distribution`,
      colorIntent: "distribution",
    });
  }

  charts.push({
    id: charts.length ? `chart_${charts.length + 1}` : "chart_1",
    type: "table",
    x: categorical ?? metric ?? meta.columns[0]?.name ?? "column",
    y: metric ?? undefined,
    title: "Sample records",
    colorIntent: "focus",
  });

  return charts.slice(0, 5);
}
