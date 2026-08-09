"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Dialog, DialogTrigger } from "@/shared/ui/dialog";
import { ChartPromptDialog } from "./ChartPromptDialog";
import { generateChartFromPrompt } from "@/features/dashboard/client/generate-chart";
import { useToast } from "@/shared/hooks/use-toast";
import { useTranslation } from "@/shared/i18n";

/**
 * Edit-mode tile that asks the AI to create a chart from a short prompt. Routes
 * through the shared generate path, so it shows the same glow -> reveal magic
 * as the chatbot. Built as a quick-add, not a second chat window.
 */
export function AddChartTile() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [isBusy, setIsBusy] = useState(false);

  const submit = async (message: string) => {
    setIsBusy(true);
    try {
      const result = await generateChartFromPrompt(message);
      if (!result.added) {
        toast({
          title: "No chart added",
          description: result.assistantMessage,
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Couldn't create chart",
        description: "The AI couldn't build that chart. Try rephrasing.",
      });
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <button
            type="button"
            disabled={isBusy}
            className="transition-ui group flex h-full w-full flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-surface-muted)]/40 hover:text-[var(--color-accent)] disabled:opacity-60"
          >
            <span className="transition-ui flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-muted)] text-[var(--color-accent)] group-hover:scale-105">
              <Plus className="h-6 w-6" />
            </span>
            <span className="text-sm font-semibold">{t("dash.addChart")}</span>
            <span className="max-w-[14rem] text-center text-xs text-[var(--color-text-muted)]">
              {t("dash.addChart.hint")}
            </span>
          </button>
        </DialogTrigger>
      </Dialog>
      <ChartPromptDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={submit}
        title={t("dash.addChart")}
        placeholder={t("dash.addChart.placeholder")}
        submitLabel={t("dash.addChart.create")}
        busy={isBusy}
      />
    </>
  );
}
