import { memo, useState, type ReactNode } from "react";
import { GripVertical, Pencil, Pin } from "lucide-react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { ChartConfig, SerializedRow } from "@/shared/contracts";
import { clampToSupportedSize } from "@/shared/contracts";

import { Card } from "@/shared/ui/card";
import {
  chartPlotBox,
  resolveRenderClass,
  type CanvasTier,
} from "@/features/dashboard/client/grid";
import { updateChartFromPrompt } from "@/features/dashboard/client/generate-chart";
import { useToast } from "@/shared/hooks/use-toast";
import { useTranslation } from "@/shared/i18n";
import { ChartPromptDialog } from "./ChartPromptDialog";
import { GeneratingChartCard } from "./GeneratingChartCard";
import { AreaChartView } from "./charts/AreaChartView";
import { BarChartView } from "./charts/BarChartView";
import { DonutChartView } from "./charts/DonutChartView";
import { ScatterChartView } from "./charts/ScatterChartView";
import { ChartEmptyState } from "./charts/ChartEmptyState";
import { ChartHeadline, computeChartHeadline } from "./charts/ChartHeadline";
import type { ChartRenderClass } from "./charts/chart-theme";

type DashboardChartCardProps = {
  chart: ChartConfig;
  rows: SerializedRow[];
  insight?: string;
  /** Canvas tier from the trait resolver — every dimension below is a
   * constant lookup (docs/WIDGET_SIZING.md §3). */
  tier: CanvasTier;
  isEditing?: boolean;
  isInteracting?: boolean;
  /** Drag-handle props from `useSortable`, spread onto the drag handle. */
  dragHandleProps?: {
    attributes?: DraggableAttributes;
    listeners?: SyntheticListenerMap;
  };
  /** Size-class control rendered in the edit-mode chrome, next to the pencil. */
  sizeControl?: ReactNode;
};

function DashboardChartContent({
  chart,
  rows,
  size,
  width,
  height,
  isInteracting,
}: {
  chart: ChartConfig;
  rows: SerializedRow[];
  size: ChartRenderClass;
  width: number;
  height: number;
  isInteracting: boolean;
}) {
  if (chart.type === "area") {
    return (
      <AreaChartView
        chart={chart}
        rows={rows}
        size={size}
        width={width}
        height={height}
        isInteracting={isInteracting}
      />
    );
  }

  if (chart.type === "scatter") {
    return (
      <ScatterChartView
        chart={chart}
        rows={rows}
        width={width}
        height={height}
        isInteracting={isInteracting}
      />
    );
  }

  if (chart.type === "donut") {
    return (
      <DonutChartView
        chart={chart}
        rows={rows}
        size={size === "xlarge" ? "large" : size}
        width={width}
        height={height}
        isInteracting={isInteracting}
      />
    );
  }

  return (
    <BarChartView
      chart={chart}
      rows={rows}
      size={size}
      width={width}
      height={height}
      isInteracting={isInteracting}
    />
  );
}

const DashboardChartCard = memo(function DashboardChartCard({
  chart,
  rows,
  insight,
  tier,
  isEditing = false,
  isInteracting = false,
  dragHandleProps,
  sizeControl,
}: DashboardChartCardProps) {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const submitEdit = async (message: string) => {
    setIsUpdating(true);
    try {
      const result = await updateChartFromPrompt(chart.id, message);
      if (!result.updated) {
        toast({
          title: "No changes made",
          description: result.assistantMessage,
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Couldn't update chart",
        description: "The AI couldn't apply that change. Try rephrasing.",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Defensive clamp: persisted configs predating the size-class model may
  // hold a class this type doesn't support.
  const size = clampToSupportedSize(chart.type, chart.size);
  const renderClass = resolveRenderClass(size, tier);

  let body: ReactNode;
  if (renderClass === "small") {
    // The Small class renders the chart's headline number as a KPI —
    // never a miniature chart (docs/WIDGET_SIZING.md §4).
    const headline = computeChartHeadline(chart, rows);
    body = (
      <div className="flex h-full min-h-0 flex-col px-5 pb-5 pt-5">
        <p className="line-clamp-1 text-[12px] font-medium text-[var(--color-text-secondary)]">
          {chart.title}
        </p>
        {headline ? <ChartHeadline headline={headline} /> : <ChartEmptyState />}
      </div>
    );
  } else {
    const plot = chartPlotBox(size as Exclude<typeof size, "small">, tier);
    body = (
      <div className="flex h-full min-h-0 flex-col px-5 pb-4 pt-5">
        <div className="flex flex-row items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="line-clamp-1 font-display text-[17px] font-semibold leading-snug tracking-[-0.025em] text-[var(--color-text-primary)]">
              {chart.title}
            </h3>
            <p className="mt-1 line-clamp-1 text-[11px] leading-snug text-[var(--color-text-muted)]">
              {insight ?? chart.insight}
            </p>
          </div>
          {chart.pinned ? (
            <Pin
              className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]"
              aria-label="Pinned"
            />
          ) : null}
        </div>
        <div className="mx-auto mt-auto max-w-full overflow-hidden">
          <DashboardChartContent
            chart={chart}
            rows={rows}
            size={renderClass as ChartRenderClass}
            width={plot.width}
            height={plot.height}
            isInteracting={isInteracting}
          />
        </div>
      </div>
    );
  }

  return (
    <Card
      className={`relative flex h-full flex-col overflow-hidden rounded-[18px] border-[var(--color-border)] bg-card p-0 shadow-none ${
        isEditing ? "border-dashed border-[var(--color-accent)]/40" : ""
      }`}
      data-chart-card={chart.id}
    >
      {body}
      {isUpdating ? (
        <div className="absolute inset-0 z-30">
          <GeneratingChartCard label={t("chart.edit.updating")} />
        </div>
      ) : null}
      {isEditing ? (
        <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
          {sizeControl}
          <button
            type="button"
            onClick={() => setIsEditDialogOpen(true)}
            className="transition-ui flex h-7 w-7 items-center justify-center rounded-full bg-card/90 text-[var(--color-text-muted)] shadow-card backdrop-blur hover:text-[var(--color-accent)]"
            aria-label={`${t("chart.edit")}: ${chart.title}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <div
            {...dragHandleProps?.attributes}
            {...dragHandleProps?.listeners}
            className="widget-drag-handle flex h-7 w-7 cursor-grab items-center justify-center rounded-full bg-card/90 text-[var(--color-text-muted)] shadow-card backdrop-blur active:cursor-grabbing"
            aria-label={`Drag to move ${chart.title}`}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>
        </div>
      ) : null}
      <ChartPromptDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSubmit={submitEdit}
        title={t("chart.edit.title")}
        placeholder={t("chart.edit.placeholder")}
        submitLabel={t("chart.edit.update")}
        busy={isUpdating}
      />
    </Card>
  );
});

export { DashboardChartCard };
export type { DashboardChartCardProps };
