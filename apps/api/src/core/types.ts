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

export type ChartType = "bar" | "line" | "pie" | "table";

export type ChartConfig = {
  x?: string;
  y?: string;
  aggregation?: "sum" | "avg" | "count";
};

export type DatasetMeta = {
  columns: Column[];
  rowCount: number;
  sampleRows: Array<Record<string, unknown>>;
};

export type Chart = {
  id: string;
  type: ChartType;
  title: string;
  payload: any;
  config?: ChartConfig;
};

export type DashboardState = {
  datasetId: string;
  version: number;
  columns: Column[];
  kpis: Kpi[];
  charts: Chart[];
  hiddenChartIds: string[];
  datasetMeta?: DatasetMeta;
};
