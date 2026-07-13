import { memo, useEffect, useRef, useState, type ReactNode } from "react";
import { GripVertical, Pencil } from "lucide-react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import type { SerializedRow } from "@/shared/contracts";

import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import type { LayoutItem } from "@/features/dashboard/client/layout";
import {
  consumeRecentReveal,
  onChartReveal,
} from "@/features/dashboard/client/chart-effects";
import { updateChartFromPrompt } from "@/features/dashboard/client/generate-chart";
import { useToast } from "@/shared/hooks/use-toast";
import { useTranslation } from "@/shared/i18n";
import { ChartPromptDialog } from "./ChartPromptDialog";
import { GeneratingChartCard } from "./GeneratingChartCard";
import { AreaChartView } from "./charts/AreaChartView";
import { BarChartView } from "./charts/BarChartView";
import { DonutChartView } from "./charts/DonutChartView";
import { ScatterChartView } from "./charts/ScatterChartView";

type DashboardChartCardProps = {
  chart: LayoutItem;
  rows: SerializedRow[];
  isEditing?: boolean;
  isInteracting?: boolean;
  /** Drag-handle props from `useSortable`, spread onto the drag handle. */
  dragHandleProps?: {
    attributes?: DraggableAttributes;
    listeners?: SyntheticListenerMap;
  };
  /** S/M/L size control rendered in the edit-mode chrome, next to the pencil. */
  sizeControl?: ReactNode;
};

const DashboardChartContent = memo(function DashboardChartContent({
  chart,
  rows,
  isInteracting,
}: {
  chart: LayoutItem;
  rows: SerializedRow[];
  isInteracting: boolean;
}) {
  if (chart.type === "area") {
    return <AreaChartView chart={chart} rows={rows} isInteracting={isInteracting} />;
  }

  if (chart.type === "scatter") {
    return <ScatterChartView chart={chart} rows={rows} isInteracting={isInteracting} />;
  }

  if (chart.type === "donut") {
    return <DonutChartView chart={chart} rows={rows} isInteracting={isInteracting} />;
  }

  return <BarChartView chart={chart} rows={rows} isInteracting={isInteracting} />;
});

const DashboardChartCard = memo(function DashboardChartCard({
  chart,
  rows,
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

  // One-time "magic" reveal glow when this chart is freshly created by the AI.
  const [isRevealing, setIsRevealing] = useState(false);
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const startReveal = () => {
      setIsRevealing(true);
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
      }
      revealTimerRef.current = setTimeout(() => setIsRevealing(false), 2200);
    };
    const unsubscribe = onChartReveal((id) => {
      if (id === chart.id) {
        startReveal();
      }
    });
    // Catch a reveal emitted just before this card mounted (new AI charts).
    if (consumeRecentReveal(chart.id)) {
      startReveal();
    }
    return () => {
      unsubscribe();
      if (revealTimerRef.current) {
        clearTimeout(revealTimerRef.current);
      }
    };
  }, [chart.id]);

  return (
    <Card
      className={`premium-card premium-hover @container relative flex h-full flex-col overflow-hidden rounded-[20px] p-0 ${
        isEditing ? "border-dashed border-[var(--color-accent)]/40" : ""
      }`}
      data-chart-card={chart.id}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 px-6 pb-0 pt-6">
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-display text-[17px] font-extrabold leading-snug tracking-[-0.01em] text-[var(--color-text-primary)]">
            {chart.title}
          </h3>
          <p className="mt-1 hidden line-clamp-2 text-[12px] leading-snug text-[var(--color-text-secondary)] @sm:block">
            {chart.insight}
          </p>
        </div>
        <div className="flex items-center gap-1">
          {chart.pinned ? (
            <Badge className="rounded-full border-0 bg-[var(--color-surface-muted)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]">
              pinned
            </Badge>
          ) : null}
          <Badge className="rounded-full border border-[var(--color-border)] bg-transparent px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)] hover:bg-transparent">
            {chart.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex min-h-0 flex-1 flex-col px-6 pb-6 pt-4">
        <DashboardChartContent chart={chart} rows={rows} isInteracting={isInteracting} />
      </CardContent>
      {isRevealing ? (
        <div
          aria-hidden="true"
          className="ai-glow-ring ai-glow-ring-mask pointer-events-none absolute inset-0 z-20 rounded-[20px]"
          style={{
            animation:
              "tada-glow-spin 4s linear infinite, tada-reveal-fade 2.2s ease-out forwards",
          }}
        />
      ) : null}
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
