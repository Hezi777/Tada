export type ColumnKind = "numeric" | "categorical" | "date" | "ignored";

export type Column = {
  name: string;
  kind: ColumnKind;
};

export type Kpi = {
  id: string;
  label: string;
  value: string | number;
};

export type ChartType = "bar" | "line" | "table";

export type Chart = {
  id: string;
  type: ChartType;
  title: string;
  payload: any;
};

export type DashboardState = {
  datasetId: string;
  version: number;
  columns: Column[];
  kpis: Kpi[];
  charts: Chart[];
  hiddenChartIds: string[];
};
