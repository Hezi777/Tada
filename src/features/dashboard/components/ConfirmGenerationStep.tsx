"use client";

import { useState } from "react";
import { FileSpreadsheet, ShieldCheck, Sparkles } from "lucide-react";
import {
  DATASET_TOPICS,
  DATASET_TOPIC_LABELS,
  type DatasetTopic,
  type UploadProfileResponse,
} from "@/shared/contracts";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";

const CHART_COUNT_OPTIONS = [2, 3, 4, 5, 6] as const;

export function ConfirmGenerationStep({
  profiled,
  onConfirm,
  onCancel,
  isGenerating,
}: {
  profiled: UploadProfileResponse;
  onConfirm: (topic: DatasetTopic, chartCount: number) => void;
  onCancel: () => void;
  isGenerating: boolean;
}) {
  const [topic, setTopic] = useState<DatasetTopic>(profiled.suggestedTopic);
  const [chartCount, setChartCount] = useState<number>(4);

  const kindCounts = profiled.profile.columns.reduce<Record<string, number>>(
    (acc, column) => {
      if (column.kind !== "ignored") {
        acc[column.kind] = (acc[column.kind] ?? 0) + 1;
      }
      return acc;
    },
    {},
  );

  return (
    <div className="flex h-full flex-col items-center justify-center overflow-y-auto px-5 py-6">
      <Card className="w-full max-w-xl rounded-[24px] border-0 bg-card p-8 shadow-[0_22px_52px_-38px_rgba(25,28,30,0.14)]">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(0,50,125,0.1)]">
            <FileSpreadsheet className="h-5 w-5 text-[var(--color-accent)]" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl text-[var(--color-text-primary)]">
              {profiled.fileName}
            </h2>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {profiled.rowCount.toLocaleString()} rows ·{" "}
              {profiled.profile.columnCount} columns
            </p>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {kindCounts.numeric ? (
            <span className="rounded-full bg-[var(--color-bg)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
              {kindCounts.numeric} numeric{" "}
              {kindCounts.numeric === 1 ? "column" : "columns"}
            </span>
          ) : null}
          {kindCounts.categorical ? (
            <span className="rounded-full bg-[var(--color-bg)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
              {kindCounts.categorical}{" "}
              {kindCounts.categorical === 1 ? "category" : "categories"}
            </span>
          ) : null}
          {kindCounts.date ? (
            <span className="rounded-full bg-[var(--color-bg)] px-3 py-1 text-xs font-medium text-[var(--color-text-secondary)]">
              {kindCounts.date} date{" "}
              {kindCounts.date === 1 ? "column" : "columns"}
            </span>
          ) : null}
        </div>

        {profiled.profile.piiColumns.length > 0 ? (
          <div className="mt-4 flex items-start gap-2 rounded-[20px] bg-[var(--color-bg)] px-4 py-3">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
            <p className="text-xs leading-5 text-[var(--color-text-secondary)]">
              Personal data detected in {profiled.profile.piiColumns.join(", ")}{" "}
              - these columns are kept out of AI prompts and search indexes.
            </p>
          </div>
        ) : null}

        <div className="mt-6 space-y-5">
          <div>
            <label
              htmlFor="dataset-topic"
              className="text-sm font-medium text-[var(--color-text-primary)]"
            >
              What kind of data is this?
            </label>
            <Select
              value={topic}
              onValueChange={(value) => setTopic(value as DatasetTopic)}
            >
              <SelectTrigger
                id="dataset-topic"
                className="mt-2 rounded-full border-0 bg-[var(--color-bg)]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATASET_TOPICS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {DATASET_TOPIC_LABELS[option].en}
                    {option === profiled.suggestedTopic ? "  ·  detected" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              How many charts?
            </span>
            <div
              className="mt-2 flex gap-2"
              role="radiogroup"
              aria-label="Number of charts"
            >
              {CHART_COUNT_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  role="radio"
                  aria-checked={chartCount === count}
                  onClick={() => setChartCount(count)}
                  className={`h-10 w-10 rounded-full text-sm font-semibold transition-colors ${
                    chartCount === count
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-bg)] text-[var(--color-text-secondary)] hover:bg-[rgba(0,50,125,0.1)]"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={onCancel}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="lg"
            className="rounded-full bg-[var(--color-accent)] px-8 text-white hover:bg-[var(--color-accent-secondary)]"
            onClick={() => onConfirm(topic, chartCount)}
            disabled={isGenerating}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate dashboard"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
