"use client";

import { useMemo } from "react";
import { useDashboardStore } from "./store";
import {
  buildDashboardTrustModel,
  filterRowsByDateRange,
  type DashboardDateRange,
} from "./trust";

export function useDashboardTrust(range: DashboardDateRange | null) {
  const snapshot = useDashboardStore((current) => current);
  const model = useMemo(
    () =>
      buildDashboardTrustModel({
        fileName: snapshot.fileName,
        files: snapshot.files,
        columns: snapshot.columns,
        rows: snapshot.rows,
        charts: snapshot.charts,
        expectedRowCount: snapshot.datasetMeta?.rowCount,
      }),
    [snapshot],
  );
  const rows = useMemo(
    () => filterRowsByDateRange(snapshot.rows, model.dateColumn, range),
    [model.dateColumn, range, snapshot.rows],
  );

  return {
    model,
    rows,
    columns: snapshot.columns.map((column) => column.name),
  };
}
