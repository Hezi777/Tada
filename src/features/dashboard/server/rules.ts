import {
  BI_RULE_LIMITS,
  type ChartConfig,
  type RuleViolation,
} from "@/shared/contracts";
import type { Column } from "./types";

type Row = Record<string, unknown>;

export type RuleEngineResult = {
  charts: ChartConfig[];
  violations: RuleViolation[];
};

// Deterministic BI rule engine. The LLM sees retrieved rules in its prompt,
// but prompts are advisory — this engine is the enforcement layer. Each check
// maps to a rule_id in data/bi-rules.json and applies that rule's
// action_if_fail. Policy by severity: error/warning violations are corrected
// when a safe transform exists, info violations are only recorded.

const ID_NAME_PATTERN =
  /(^|[_\s])(id|uuid|phone|tel|מזהה|טלפון|ת"ז|תז)([_\s]|$)|מספר זהות/i;
const RATE_NAME_PATTERN =
  /rate|percent|ratio|score|price|avg|average|אחוז|ממוצע|ציון|מחיר/i;

function distinctValues(rows: Row[], columnName: string): Set<string> {
  const values = new Set<string>();
  for (const row of rows) {
    const raw = row[columnName];
    if (raw === null || raw === undefined || raw === "") {
      continue;
    }
    values.add(String(raw));
  }
  return values;
}

function averageLabelLength(values: Set<string>): number {
  if (values.size === 0) {
    return 0;
  }
  let total = 0;
  for (const value of values) {
    total += value.length;
  }
  return total / values.size;
}

function looksLikeIdentifier(rows: Row[], column: Column): boolean {
  if (ID_NAME_PATTERN.test(column.name)) {
    return true;
  }
  if (column.kind !== "numeric" || rows.length < 5) {
    return false;
  }
  const distinct = distinctValues(rows, column.name);
  return distinct.size / rows.length > 0.95;
}

export function applyBiRules(
  charts: ChartConfig[],
  columns: Column[],
  rows: Row[],
): RuleEngineResult {
  const violations: RuleViolation[] = [];
  const columnByName = new Map(columns.map((column) => [column.name, column]));

  const corrected = charts.map((chart) => {
    let next: ChartConfig = { ...chart };

    // pie_max_slices / top_n_with_other_bucket: donuts beyond the segment
    // limit either get an Other bucket or become a sorted bar chart.
    if (next.type === "donut" && next.groupBy) {
      const distinct = distinctValues(rows, next.groupBy).size;
      if (distinct > 10) {
        violations.push({
          ruleId: "pie_max_slices",
          chartId: next.id,
          action: "convert_to_bar",
          severity: "error",
          applied: true,
          detail: `${distinct} categories in ${next.groupBy} is far past the donut limit; converted to a sorted bar chart.`,
        });
        next = {
          ...next,
          type: "bar",
          categoryLimit: 10,
          title: next.title.replace(/share/i, "breakdown"),
        };
      } else if (distinct > BI_RULE_LIMITS.maxDonutSegments) {
        violations.push({
          ruleId: "top_n_with_other_bucket",
          chartId: next.id,
          action: "aggregate_other_bucket",
          severity: "warning",
          applied: true,
          detail: `${distinct} categories in ${next.groupBy}; capped to top ${BI_RULE_LIMITS.maxDonutSegments - 1} plus an Other bucket.`,
        });
        next = { ...next, categoryLimit: BI_RULE_LIMITS.maxDonutSegments };
      }
    }

    // no_line_for_unordered_categories: an area/line shape without a real
    // date axis implies continuity that is not there.
    if (next.type === "area") {
      const timeColumn = next.timeColumn
        ? columnByName.get(next.timeColumn)
        : null;
      if (!timeColumn || timeColumn.kind !== "date") {
        violations.push({
          ruleId: "no_line_for_unordered_categories",
          chartId: next.id,
          action: "convert_to_bar",
          severity: "error",
          applied: true,
          detail: `Area chart "${next.title}" has no date column; converted to bar.`,
        });
        next = { ...next, type: "bar", timeColumn: null };
      }
    }

    if (next.type === "bar" && next.groupBy) {
      const distinct = distinctValues(rows, next.groupBy);

      // long_labels_use_horizontal_bar: long category names need the
      // horizontal layout to stay readable without rotation.
      if (averageLabelLength(distinct) > 12 && next.orientation !== "horizontal") {
        violations.push({
          ruleId: "long_labels_use_horizontal_bar",
          chartId: next.id,
          action: "use_horizontal_bar",
          severity: "warning",
          applied: true,
          detail: `Category labels in ${next.groupBy} average more than 12 characters; switched to horizontal bars.`,
        });
        next = { ...next, orientation: "horizontal" };
      }

      // limit_categories_per_chart: cap to top-N plus Other.
      if (distinct.size > 12 && !next.categoryLimit) {
        violations.push({
          ruleId: "limit_categories_per_chart",
          chartId: next.id,
          action: "limit_categories",
          severity: "warning",
          applied: true,
          detail: `${distinct.size} categories in ${next.groupBy}; capped to the top 10 plus an Other bucket.`,
        });
        next = { ...next, categoryLimit: 10 };
      }
    }

    // israeli_ids_phones_are_categorical / count_for_categorical_and_ids:
    // identifier-like columns must never be summed or averaged.
    if (
      (next.aggregation === "sum" || next.aggregation === "avg") &&
      next.columns.length > 0
    ) {
      const measure = columnByName.get(next.columns[0]);
      if (measure && looksLikeIdentifier(rows, measure)) {
        violations.push({
          ruleId: "israeli_ids_phones_are_categorical",
          chartId: next.id,
          action: "treat_as_categorical",
          severity: "error",
          applied: true,
          detail: `${measure.name} looks like an identifier column; aggregation changed to count.`,
        });
        next = { ...next, aggregation: "count" };
      }
    }

    // average_for_rates_and_levels: summing rates/prices/scores produces
    // meaningless totals.
    if (next.aggregation === "sum" && next.columns.length > 0) {
      const measureName = next.columns[0];
      const measure = columnByName.get(measureName);
      if (
        measure &&
        measure.kind === "numeric" &&
        RATE_NAME_PATTERN.test(measureName)
      ) {
        violations.push({
          ruleId: "average_for_rates_and_levels",
          chartId: next.id,
          action: "use_avg_aggregation",
          severity: "warning",
          applied: true,
          detail: `${measureName} is a rate-like measure; aggregation changed from sum to avg.`,
        });
        next = { ...next, aggregation: "avg" };
      }
    }

    // single_value_use_kpi_card (info): record charts that would render a
    // single data point; KPI cards already cover these.
    if (next.groupBy) {
      const distinct = distinctValues(rows, next.groupBy).size;
      if (distinct === 1) {
        violations.push({
          ruleId: "single_value_use_kpi_card",
          chartId: next.id,
          action: "switch_to_table",
          severity: "info",
          applied: false,
          detail: `${next.groupBy} has a single distinct value; a KPI card would carry this better.`,
        });
      }
    }

    return next;
  });

  return { charts: corrected, violations };
}
