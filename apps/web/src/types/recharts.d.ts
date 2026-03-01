declare module "recharts" {
  import type { ComponentType } from "react";

  type RechartsComponent = ComponentType<Record<string, unknown>>;

  export const Area: RechartsComponent;
  export const AreaChart: RechartsComponent;
  export const Bar: RechartsComponent;
  export const BarChart: RechartsComponent;
  export const CartesianGrid: RechartsComponent;
  export const Cell: RechartsComponent;
  export const Label: RechartsComponent;
  export const Pie: RechartsComponent;
  export const PieChart: RechartsComponent;
  export const ResponsiveContainer: RechartsComponent;
  export const Scatter: RechartsComponent;
  export const ScatterChart: RechartsComponent;
  export const Sector: RechartsComponent;
  export const Tooltip: RechartsComponent;
  export const XAxis: RechartsComponent;
  export const YAxis: RechartsComponent;
}
