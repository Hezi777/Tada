import { useSyncExternalStore } from "react";
import type {
  ChatChartProposal,
  ChatbotChartPatch,
  ChartConfig,
  DashboardColumn,
  DatasetMeta,
  KPIConfig,
  LoadedDatasetFile,
  SerializedRow,
  UploadDashboardResponse,
  DashboardListItem,
} from "@/shared/contracts";
import { normalizeChartConfig } from "@/shared/contracts";
import {
  isChartVisible,
  toStoreContext,
  validateChartCollection,
  validateKpiCollection,
} from "@/features/dashboard/client/runtime";

type DashboardStoreState = {
  datasetId: string | null;
  version: number;
  fileName: string | null;
  columns: DashboardColumn[];
  datasetMeta?: DatasetMeta;
  files: LoadedDatasetFile[];
  rows: SerializedRow[];
  charts: ChartConfig[];
  kpis: KPIConfig[];
  activeDashboardId: string | null;
  activeDashboardName: string | null;
  activeDashboardIcon: string | null;
  activeDashboardColor: string | null;
  dashboardList: DashboardListItem[];
  dashboardCache: Record<
    string,
    Omit<DashboardStoreState, "dashboardList" | "dashboardCache">
  >;
};

type CachedDashboardState = Omit<
  DashboardStoreState,
  "dashboardList" | "dashboardCache"
>;

type Listener = () => void;

const listeners = new Set<Listener>();

let state: DashboardStoreState = {
  datasetId: null,
  version: 0,
  fileName: null,
  columns: [],
  datasetMeta: undefined,
  files: [],
  rows: [],
  charts: [],
  kpis: [],
  activeDashboardId: null,
  activeDashboardName: null,
  activeDashboardIcon: null,
  activeDashboardColor: null,
  dashboardList: [],
  dashboardCache: {},
};

function emit(): void {
  for (const listener of listeners) {
    listener();
  }
}

function normalizeOrders(charts: ChartConfig[]): ChartConfig[] {
  const normalized = charts.map((chart) => normalizeChartConfig(chart));
  const visible = normalized.filter(isChartVisible);
  const hidden = normalized.filter((chart) => !isChartVisible(chart));

  return [...visible, ...hidden]
    .sort((left, right) => left.order - right.order)
    .map((chart, index) =>
      normalizeChartConfig({
        ...chart,
        order: index,
        priority: chart.priority ?? index,
      }),
    );
}

function setState(next: DashboardStoreState): void {
  state = next;
  emit();
}

function validateNextState(next: DashboardStoreState): void {
  const chartError = validateChartCollection(
    normalizeOrders(next.charts),
    toStoreContext({
      columns: next.columns,
      rows: next.rows,
      datasetMeta: next.datasetMeta,
    }),
  );
  if (chartError) {
    throw new Error(chartError);
  }
  const kpiError = validateKpiCollection(next.kpis);
  if (kpiError) {
    throw new Error(kpiError);
  }
}

function withValidatedState(
  updater: (current: DashboardStoreState) => DashboardStoreState,
): void {
  const next = updater(state);
  const normalized: DashboardStoreState = {
    ...next,
    charts: normalizeOrders(next.charts),
  };
  validateNextState(normalized);
  setState(normalized);
}

function prepareInitialState(
  snapshot: UploadDashboardResponse,
): DashboardStoreState {
  const next: DashboardStoreState = {
    datasetId: snapshot.datasetId,
    version: snapshot.version,
    fileName: snapshot.fileName,
    columns: snapshot.columns,
    datasetMeta: snapshot.datasetMeta,
    files: snapshot.files,
    rows: snapshot.rows,
    charts: normalizeOrders(
      snapshot.charts.map((chart) => normalizeChartConfig(chart)),
    ),
    kpis: [...snapshot.kpis],
    activeDashboardId: null,
    activeDashboardName: null,
    activeDashboardIcon: null,
    activeDashboardColor: null,
    dashboardList: state.dashboardList,
    dashboardCache: state.dashboardCache,
  };
  validateNextState(next);
  return next;
}

export function initializeDashboardStore(
  snapshot: UploadDashboardResponse,
  dashboard?: { id: string; name: string; icon: string; color: string },
): void {
  const prepared = prepareInitialState(snapshot);
  const newState = {
    ...prepared,
    activeDashboardId: dashboard?.id ?? state.activeDashboardId,
    activeDashboardName: dashboard?.name ?? state.activeDashboardName,
    activeDashboardIcon: dashboard?.icon ?? state.activeDashboardIcon,
    activeDashboardColor: dashboard?.color ?? state.activeDashboardColor,
  };

  // Cache this full dashboard if an ID is present
  const dashId = newState.activeDashboardId;
  if (dashId) {
    const {
      dashboardList: _dashboardList,
      dashboardCache: _dashboardCache,
      ...cachedState
    } = newState;
    newState.dashboardCache = {
      ...state.dashboardCache,
      [dashId]: cachedState,
    };
  }

  setState(newState);
}

export function getDashboardList(): DashboardListItem[] {
  return state.dashboardList;
}

export function setDashboardList(list: DashboardListItem[]): void {
  setState({ ...state, dashboardList: list });
}

export function setDashboardCache(
  dashboardId: string,
  dashboardState: Omit<DashboardStoreState, "dashboardList" | "dashboardCache">,
): void {
  setState({
    ...state,
    dashboardCache: {
      ...state.dashboardCache,
      [dashboardId]: dashboardState,
    },
  });
}

export function getCachedDashboard(dashboardId: string) {
  return state.dashboardCache[dashboardId];
}

export function restoreCachedDashboard(
  cached: Omit<DashboardStoreState, "dashboardList" | "dashboardCache">,
): void {
  setState({
    ...cached,
    dashboardList: state.dashboardList,
    dashboardCache: state.dashboardCache,
  });
}

export function setActiveDashboard(dashboard: {
  id: string;
  name: string;
  icon: string;
  color: string;
}): void {
  setState({
    ...state,
    activeDashboardId: dashboard.id,
    activeDashboardName: dashboard.name,
    activeDashboardIcon: dashboard.icon,
    activeDashboardColor: dashboard.color,
  });
}

export function clearActiveDashboard(): void {
  setState({
    ...state,
    activeDashboardId: null,
    activeDashboardName: null,
    activeDashboardIcon: null,
    activeDashboardColor: null,
  });
}

export function resetDashboardStore(): void {
  setState({
    datasetId: null,
    version: 0,
    fileName: null,
    columns: [],
    datasetMeta: undefined,
    files: [],
    rows: [],
    charts: [],
    kpis: [],
    activeDashboardId: null,
    activeDashboardName: null,
    activeDashboardIcon: null,
    activeDashboardColor: null,
    dashboardList: state.dashboardList,
    dashboardCache: state.dashboardCache,
  });
}

export function getDashboardStoreState(): DashboardStoreState {
  return state;
}

export function applyDatasetChainSnapshot(
  snapshot: UploadDashboardResponse,
): void {
  const keepCurrentCharts =
    state.datasetId === snapshot.datasetId && state.charts.length > 0
      ? normalizeOrders(state.charts)
      : normalizeOrders(snapshot.charts);

  const next: DashboardStoreState = {
    datasetId: snapshot.datasetId,
    version:
      state.datasetId === snapshot.datasetId
        ? Math.max(state.version + 1, snapshot.version)
        : snapshot.version,
    fileName: snapshot.fileName,
    columns: snapshot.columns,
    datasetMeta: snapshot.datasetMeta,
    files: snapshot.files,
    rows: snapshot.rows,
    charts: keepCurrentCharts,
    kpis: [...snapshot.kpis],
    activeDashboardId: state.activeDashboardId,
    activeDashboardName: state.activeDashboardName,
    activeDashboardIcon: state.activeDashboardIcon,
    activeDashboardColor: state.activeDashboardColor,
    dashboardList: state.dashboardList,
    dashboardCache: state.dashboardCache,
  };

  validateNextState(next);
  setState(next);
}

export function addChart(config: ChartConfig): void {
  withValidatedState((current) => ({
    ...current,
    version: current.version + 1,
    charts: [...current.charts, normalizeChartConfig(config)],
  }));
}

export function removeChart(id: string): void {
  withValidatedState((current) => ({
    ...current,
    version: current.version + 1,
    charts: current.charts.filter((chart) => chart.id !== id),
  }));
}

export function updateChart(id: string, patch: Partial<ChartConfig>): void {
  withValidatedState((current) => ({
    ...current,
    version: current.version + 1,
    charts: current.charts.map((chart) =>
      chart.id === id
        ? normalizeChartConfig({
            ...chart,
            ...patch,
            id: chart.id,
          })
        : chart,
    ),
  }));
}

export function setChartVisibility(id: string, visible: boolean): void {
  withValidatedState((current) => ({
    ...current,
    version: current.version + 1,
    charts: current.charts.map((chart) =>
      chart.id === id
        ? normalizeChartConfig({
            ...chart,
            visible,
            visibilityState: visible ? "visible" : "hidden",
          })
        : chart,
    ),
  }));
}

export function toggleChartPinned(id: string): void {
  withValidatedState((current) => ({
    ...current,
    version: current.version + 1,
    charts: current.charts.map((chart) =>
      chart.id === id
        ? normalizeChartConfig({
            ...chart,
            pinned: !chart.pinned,
            lastTouchedBy: "user",
          })
        : chart,
    ),
  }));
}

export function applyChartProposal(
  proposal: ChatChartProposal,
  action: "replace" | "hide_target",
): void {
  withValidatedState((current) => {
    if (!proposal.targetChartId) {
      return current;
    }

    if (action === "replace") {
      return {
        ...current,
        version: current.version + 1,
        charts: current.charts.map((chart) =>
          chart.id === proposal.targetChartId
            ? normalizeChartConfig({
                ...proposal.incomingConfig,
                id: chart.id,
                order: chart.order,
                priority: chart.priority,
              })
            : chart,
        ),
      };
    }

    const targetChart = current.charts.find(
      (chart) => chart.id === proposal.targetChartId,
    );
    if (!targetChart) {
      return current;
    }

    const hiddenTarget = current.charts.map((chart) =>
      chart.id === proposal.targetChartId
        ? normalizeChartConfig({
            ...chart,
            visible: false,
            visibilityState: "hidden",
          })
        : chart,
    );

    return {
      ...current,
      version: current.version + 1,
      charts: [
        ...hiddenTarget,
        normalizeChartConfig({
          ...proposal.incomingConfig,
          id: proposal.incomingConfig.id,
          order: targetChart.order,
          priority: targetChart.priority,
        }),
      ],
    };
  });
}

export function promoteHiddenChart(
  chartId: string,
  replaceChartId?: string,
): void {
  withValidatedState((current) => {
    const incomingChart = current.charts.find((chart) => chart.id === chartId);
    if (!incomingChart) {
      return current;
    }

    if (!replaceChartId) {
      const visibleCount = current.charts.filter(isChartVisible).length;
      return {
        ...current,
        version: current.version + 1,
        charts: current.charts.map((chart) =>
          chart.id === chartId
            ? normalizeChartConfig({
                ...chart,
                visible: true,
                visibilityState: "visible",
                order: visibleCount,
                priority: visibleCount,
              })
            : chart,
        ),
      };
    }

    const replaceChart = current.charts.find((chart) => chart.id === replaceChartId);
    if (!replaceChart) {
      return current;
    }

    return {
      ...current,
      version: current.version + 1,
      charts: current.charts.map((chart) => {
        if (chart.id === replaceChartId) {
          return normalizeChartConfig({
            ...chart,
            visible: false,
            visibilityState: "hidden",
          });
        }
        if (chart.id === chartId) {
          return normalizeChartConfig({
            ...chart,
            visible: true,
            visibilityState: "visible",
            order: replaceChart.order,
            priority: replaceChart.priority,
          });
        }
        return chart;
      }),
    };
  });
}

export function reorderCharts(orderedIds: string[]): void {
  withValidatedState((current) => {
    const chartMap = new Map(current.charts.map((chart) => [chart.id, chart]));
    const reordered = orderedIds
      .map((id) => chartMap.get(id))
      .filter((chart): chart is ChartConfig => Boolean(chart));
    const remaining = current.charts.filter(
      (chart) => !orderedIds.includes(chart.id),
    );
    return {
      ...current,
      version: current.version + 1,
      charts: [...reordered, ...remaining].map((chart, index) => ({
        ...chart,
        order: index,
      })),
    };
  });
}

/**
 * Reorder the unified widget canvas (KPIs + visible charts). `orderedIds` is
 * the full new order of widget ids; KPIs and charts are each re-assigned a
 * contiguous `order` (0..n-1) within their own collection, matching their
 * relative order in `orderedIds`. Hidden charts keep ordering after visible
 * ones (handled by `normalizeOrders`).
 */
export function reorderWidgets(orderedIds: string[]): void {
  withValidatedState((current) => {
    const kpiMap = new Map(current.kpis.map((kpi) => [kpi.id, kpi]));
    const chartMap = new Map(current.charts.map((chart) => [chart.id, chart]));

    let kpiIndex = 0;
    let chartIndex = 0;
    const nextKpis = new Map<string, KPIConfig>();
    const nextCharts = new Map<string, ChartConfig>();

    for (const id of orderedIds) {
      const kpi = kpiMap.get(id);
      if (kpi) {
        nextKpis.set(id, { ...kpi, order: kpiIndex });
        kpiIndex += 1;
        continue;
      }
      const chart = chartMap.get(id);
      if (chart) {
        nextCharts.set(id, { ...chart, order: chartIndex });
        chartIndex += 1;
      }
    }

    return {
      ...current,
      version: current.version + 1,
      kpis: current.kpis.map((kpi) => nextKpis.get(kpi.id) ?? kpi),
      charts: current.charts.map((chart) => {
        const reordered = nextCharts.get(chart.id);
        return reordered
          ? normalizeChartConfig({ ...chart, ...reordered })
          : chart;
      }),
    };
  });
}

export function setKPI(id: string, patch: Partial<KPIConfig>): void {
  withValidatedState((current) => ({
    ...current,
    version: current.version + 1,
    kpis: current.kpis.map((kpi) =>
      kpi.id === id ? { ...kpi, ...patch, id: kpi.id } : kpi,
    ),
  }));
}

export function updateKpi(id: string, patch: Partial<KPIConfig>): void {
  setKPI(id, patch);
}

export function applyChatbotPatch(patch: ChatbotChartPatch | null): void {
  if (!patch) {
    return;
  }
  if (patch.action === "add") {
    addChart(patch.config);
    return;
  }
  if (patch.action === "remove") {
    removeChart(patch.chartId);
    return;
  }
  updateChart(patch.chartId, patch.config);
}

export function useDashboardStore<T>(
  selector: (snapshot: DashboardStoreState) => T,
): T {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => selector(state),
    () => selector(state),
  );
}

declare global {
  interface Window {
    tadaDashboardStore?: {
      addChart: typeof addChart;
      removeChart: typeof removeChart;
      updateChart: typeof updateChart;
      setChartVisibility: typeof setChartVisibility;
      toggleChartPinned: typeof toggleChartPinned;
      applyChartProposal: typeof applyChartProposal;
      promoteHiddenChart: typeof promoteHiddenChart;
      reorderCharts: typeof reorderCharts;
      reorderWidgets: typeof reorderWidgets;
      setKPI: typeof setKPI;
      updateKpi: typeof updateKpi;
      applyChatbotPatch: typeof applyChatbotPatch;
      getState: typeof getDashboardStoreState;
    };
  }
}

if (typeof window !== "undefined") {
  window.tadaDashboardStore = {
    addChart,
    removeChart,
    updateChart,
    setChartVisibility,
    toggleChartPinned,
    applyChartProposal,
    promoteHiddenChart,
    reorderCharts,
    reorderWidgets,
    setKPI,
    updateKpi,
    applyChatbotPatch,
    getState: getDashboardStoreState,
  };
}
