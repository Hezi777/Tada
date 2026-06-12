import type { ChartConfig } from "@/shared/contracts";

export type LayoutItem = ChartConfig & {
  colSpan: number;
};

const GRID_COLUMNS = 12;

function baseColSpan(size: ChartConfig["size"]): number {
  if (size === "large") {
    return 8;
  }
  return 4;
}

/** Scale a row's items so their colSpans sum to GRID_COLUMNS (no gaps). */
function normalizeRow(row: LayoutItem[]): LayoutItem[] {
  if (row.length === 0) {
    return row;
  }

  const used = row.reduce((sum, item) => sum + item.colSpan, 0);
  const remaining = GRID_COLUMNS - used;
  if (remaining <= 0) {
    return row;
  }

  if (row.length === 1) {
    return [{ ...row[0], colSpan: GRID_COLUMNS }];
  }

  const next = row.map((item) => ({ ...item }));
  let remainder = remaining;

  while (remainder > 0) {
    let targetIndex = 0;
    for (let index = 1; index < next.length; index += 1) {
      if (next[index].colSpan < next[targetIndex].colSpan) {
        targetIndex = index;
      }
    }
    next[targetIndex] = {
      ...next[targetIndex],
      colSpan: next[targetIndex].colSpan + 2,
    };
    remainder -= 2;
  }

  return next;
}

export function calculateLayout(charts: ChartConfig[]): LayoutItem[] {
  const ordered = [...charts]
    .sort((left, right) => left.order - right.order)
    .map((chart) => ({
      ...chart,
      colSpan: baseColSpan(chart.size),
    }));

  const rows: LayoutItem[][] = [];
  let currentRow: LayoutItem[] = [];
  let usedColumns = 0;

  for (const chart of ordered) {
    if (usedColumns + chart.colSpan > GRID_COLUMNS) {
      rows.push(currentRow);
      currentRow = [chart];
      usedColumns = chart.colSpan;
      continue;
    }

    currentRow.push(chart);
    usedColumns += chart.colSpan;

    if (usedColumns === GRID_COLUMNS) {
      rows.push(currentRow);
      currentRow = [];
      usedColumns = 0;
    }
  }

  if (currentRow.length > 0) {
    rows.push(currentRow);
  }

  // Normalize EVERY row (not just the last) so each one fills the full grid
  // width — the dashboard tiles with no gaps regardless of chart count.
  return rows.map(normalizeRow).flat();
}
