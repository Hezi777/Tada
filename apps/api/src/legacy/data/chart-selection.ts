import type { ChartSpec } from "@tada/shared";
import type { DatasetProfile, ColumnProfile } from "./profile-dataset";

const MAX_CATEGORY_CARDINALITY = 30;

function titleize(name: string): string {
  return name
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function pickPrimaryNumeric(profile: DatasetProfile): ColumnProfile | null {
  const candidates = profile.columns.filter(
    (column) => column.role === "numeric" && !column.isIdLike
  );
  if (candidates.length === 0) {
    return null;
  }
  return candidates.sort((a, b) => (b.numeric?.count ?? 0) - (a.numeric?.count ?? 0))[0];
}

function pickCategoricals(profile: DatasetProfile): ColumnProfile[] {
  return profile.columns.filter(
    (column) =>
      column.role === "categorical" &&
      !column.isIdLike &&
      !column.isTextLong &&
      (column.categorical?.cardinality ?? 0) <= MAX_CATEGORY_CARDINALITY
  );
}

function pickBestCategorical(profile: DatasetProfile, exclude: Set<string>): ColumnProfile | null {
  const candidates = pickCategoricals(profile).filter((column) => !exclude.has(column.name));
  if (candidates.length === 0) {
    return null;
  }
  return candidates.sort((a, b) => {
    const aCard = a.categorical?.cardinality ?? 0;
    const bCard = b.categorical?.cardinality ?? 0;
    const aScore = (1 - Math.abs(12 - Math.min(aCard, 12)) / 12) - a.missingRate;
    const bScore = (1 - Math.abs(12 - Math.min(bCard, 12)) / 12) - b.missingRate;
    return bScore - aScore;
  })[0];
}

function pickDatetime(profile: DatasetProfile): ColumnProfile | null {
  const candidates = profile.columns.filter((column) => column.role === "datetime");
  if (candidates.length === 0) {
    return null;
  }
  return candidates.sort((a, b) => b.dateParseSuccess - a.dateParseSuccess)[0];
}

function chartKey(spec: ChartSpec): string {
  return `${spec.type}:${spec.x}:${spec.y ?? "count"}`;
}

function ensureAggregation(spec: ChartSpec): ChartSpec {
  if (spec.aggregation) {
    return spec;
  }
  if (spec.y) {
    return { ...spec, aggregation: "sum" };
  }
  return { ...spec, aggregation: "count" };
}

function validateChartSpec(spec: ChartSpec, profile: DatasetProfile): ChartSpec | null {
  const x = profile.columns.find((column) => column.name === spec.x);
  const y = spec.y ? profile.columns.find((column) => column.name === spec.y) : null;
  if (!x) {
    return null;
  }
  if (x.isIdLike || x.isTextLong) {
    return null;
  }
  if (spec.type === "line") {
    if (x.role !== "datetime") {
      return null;
    }
  }
  if (spec.type === "bar" || spec.type === "pie") {
    if (x.role !== "categorical" && x.role !== "numeric") {
      return null;
    }
  }
  if (y) {
    if (y.isIdLike || y.isTextLong || y.role !== "numeric") {
      return null;
    }
  }
  return ensureAggregation(spec);
}

function tableSpec(id: string, primary: string, secondary?: string): ChartSpec {
  return {
    id,
    type: "table",
    x: primary,
    y: secondary,
    title: "Dataset preview",
    colorIntent: "focus",
    aggregation: "count",
  };
}

function pickTableColumns(profile: DatasetProfile): { primary: string; secondary?: string } {
  const candidates = profile.columns.filter(
    (column) => !column.isIdLike && !column.isTextLong
  );
  const columns = candidates.length ? candidates : profile.columns;
  return {
    primary: columns[0]?.name ?? "column",
    secondary: columns[1]?.name,
  };
}

export function selectCharts(
  profile: DatasetProfile,
  llmCharts?: ChartSpec[]
): ChartSpec[] {
  const charts: ChartSpec[] = [];
  const used = new Set<string>();

  const addChart = (spec: ChartSpec | null) => {
    if (!spec || charts.length >= 4) {
      return;
    }
    const normalized = ensureAggregation(spec);
    const key = chartKey(normalized);
    if (used.has(key)) {
      return;
    }
    charts.push(normalized);
    used.add(key);
  };

  if (llmCharts) {
    for (const spec of llmCharts) {
      if (charts.length >= 4) {
        break;
      }
      const validated = validateChartSpec(spec, profile);
      addChart(validated);
    }
  }

  const excludeCategorical = new Set<string>();
  const primaryNumeric = pickPrimaryNumeric(profile);
  const primaryCategorical = pickBestCategorical(profile, excludeCategorical);

  if (charts.length < 4) {
    if (primaryNumeric) {
      const title = `Distribution of ${titleize(primaryNumeric.name)}`;
      addChart({
        id: "chart_distribution",
        type: "bar",
        x: primaryNumeric.name,
        title,
        colorIntent: "distribution",
        aggregation: "count",
      });
    } else if (primaryCategorical) {
      addChart({
        id: "chart_distribution",
        type: "bar",
        x: primaryCategorical.name,
        title: `Top ${titleize(primaryCategorical.name)}`,
        colorIntent: "categorical",
        aggregation: "count",
      });
      excludeCategorical.add(primaryCategorical.name);
    }
  }

  if (charts.length < 4) {
    const topCategory = pickBestCategorical(profile, excludeCategorical);
    if (topCategory) {
      addChart({
        id: "chart_top_categories",
        type: "bar",
        x: topCategory.name,
        title: `Top ${titleize(topCategory.name)}`,
        colorIntent: "categorical",
        aggregation: "count",
      });
      excludeCategorical.add(topCategory.name);
    }
  }

  if (charts.length < 4 && primaryNumeric) {
    const relationCategory = pickBestCategorical(profile, excludeCategorical);
    if (relationCategory) {
      addChart({
        id: "chart_relationship",
        type: "bar",
        x: relationCategory.name,
        y: primaryNumeric.name,
        title: `Average ${titleize(primaryNumeric.name)} by ${titleize(relationCategory.name)}`,
        colorIntent: "categorical",
        aggregation: "avg",
      });
      excludeCategorical.add(relationCategory.name);
    }
  }

  if (charts.length < 4) {
    const dateColumn = pickDatetime(profile);
    if (dateColumn) {
      const title = primaryNumeric
        ? `${titleize(primaryNumeric.name)} over time`
        : "Records over time";
      addChart({
        id: "chart_time_trend",
        type: "line",
        x: dateColumn.name,
        y: primaryNumeric?.name,
        title,
        colorIntent: "time",
        aggregation: primaryNumeric ? "sum" : "count",
      });
    } else {
      const { primary, secondary } = pickTableColumns(profile);
      addChart(tableSpec("chart_preview", primary, secondary));
    }
  }

  while (charts.length < 4) {
    const { primary, secondary } = pickTableColumns(profile);
    addChart(tableSpec(`chart_preview_${charts.length}`, primary, secondary));
  }

  return charts.slice(0, 4);
}
