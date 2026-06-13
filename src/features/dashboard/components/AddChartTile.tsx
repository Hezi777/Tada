"use client";

import { useState } from "react";
import { Plus, Sparkles, CornerDownLeft } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
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
  const [prompt, setPrompt] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  const submit = async () => {
    const message = prompt.trim();
    if (!message || isBusy) {
      return;
    }
    setIsBusy(true);
    setOpen(false);
    setPrompt("");
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={isBusy}
          className="transition-ui group flex h-full min-h-[260px] w-full flex-col items-center justify-center gap-3 rounded-[20px] border-2 border-dashed border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-surface-muted)]/40 hover:text-[var(--color-accent)] disabled:opacity-60"
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
      <DialogContent className="w-80 rounded-2xl p-4 sm:max-w-[20rem]">
        <DialogHeader className="mb-2">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
            {t("dash.addChart")}
          </DialogTitle>
        </DialogHeader>
        <Textarea
          autoFocus
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder={t("dash.addChart.placeholder")}
          className="min-h-[84px] resize-none text-sm"
        />
        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px] text-[var(--color-text-muted)]">
            <CornerDownLeft className="h-3 w-3" />
            ⌘/Ctrl + Enter
          </span>
          <Button
            type="button"
            size="sm"
            variant="primary-accent"
            disabled={!prompt.trim() || isBusy}
            onClick={() => void submit()}
            className="transition-ui px-4"
          >
            {t("dash.addChart.create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
