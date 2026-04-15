import type {
  ChartAggregation,
  ChartConfig,
  ChartSource,
  ChartType,
  DashboardColumn,
  DashboardConfigSnapshot,
  DatasetMeta,
  KPIConfig,
} from "@/shared/contracts";

export type ColumnKind = DashboardColumn["kind"];
export type Column = DashboardColumn;
export type DashboardState = DashboardConfigSnapshot;
export type Kpi = KPIConfig;
export type Chart = ChartConfig;
export type {
  ChartAggregation,
  ChartConfig,
  ChartSource,
  ChartType,
  DatasetMeta,
  KPIConfig,
};
