"use client";

import { useState } from "react";
import { Sparkles, CornerDownLeft } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Textarea } from "@/shared/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { useTranslation } from "@/shared/i18n";

type ChartPromptDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (message: string) => Promise<void>;
  title: string;
  placeholder: string;
  submitLabel: string;
  busy?: boolean;
};

/**
 * Shared "describe a chart change" dialog: a textarea with Cmd/Ctrl+Enter
 * submit and a busy-aware submit button. Used by both AddChartTile (create a
 * new chart) and the per-chart pencil edit (rewrite an existing chart).
 */
export function ChartPromptDialog({
  open,
  onOpenChange,
  onSubmit,
  title,
  placeholder,
  submitLabel,
  busy = false,
}: ChartPromptDialogProps) {
  const { t } = useTranslation();
  const [prompt, setPrompt] = useState("");

  const submit = async () => {
    const message = prompt.trim();
    if (!message || busy) {
      return;
    }
    onOpenChange(false);
    setPrompt("");
    await onSubmit(message);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-80 rounded-2xl p-4 sm:max-w-[20rem]">
        <DialogHeader className="mb-2">
          <DialogTitle className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
            <Sparkles className="h-4 w-4 text-[var(--color-accent)]" />
            {title}
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
          placeholder={placeholder}
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
            disabled={!prompt.trim() || busy}
            onClick={() => void submit()}
            className="transition-ui px-4"
          >
            {submitLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
