"use client";

import { useState } from "react";
import { AlertTriangle, CalendarRange, Database, FileText } from "lucide-react";
import type { SerializedRow } from "@/shared/contracts";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import type { DashboardDateRange } from "@/features/dashboard/client/trust";
import { useDashboardTrust } from "@/features/dashboard/client/use-dashboard-trust";

type DashboardTrustControlsProps = {
  range: DashboardDateRange | null;
  onRangeChange: (range: DashboardDateRange | null) => void;
};

function formatTimestamp(value: string | null): string {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function displayValue(value: SerializedRow[string]): string {
  if (value === null || value === "") return "—";
  return String(value);
}

export function DashboardTrustControls({
  range,
  onRangeChange,
}: DashboardTrustControlsProps) {
  const { model, rows, columns } = useDashboardTrust(range);
  const previewRows = rows.slice(0, 100);

  return (
    <section
      aria-label="Dashboard data details"
      className="dashboard-provenance rounded-[14px] border px-3 py-2.5 sm:px-4"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[var(--color-text-secondary)]">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-[var(--color-text-primary)]">
          <FileText
            aria-hidden="true"
            className="size-3.5 shrink-0 text-[var(--dashboard-brand)]"
          />
          <span className="truncate" title={model.sourceLabel}>
            {model.sourceLabel}
          </span>
        </span>
        <span className="inline-flex items-center gap-1.5 tabular-nums">
          <Database aria-hidden="true" className="size-3.5" />
          {model.rowCount.toLocaleString()} rows
        </span>
        <span className="text-[11px] text-[var(--color-text-muted)]">
          Generated {formatTimestamp(model.generatedAt)}
        </span>

        {model.availableDateRange && model.dateColumn ? (
          <DateRangeFilter
            available={model.availableDateRange}
            column={model.dateColumn}
            range={range}
            onRangeChange={onRangeChange}
          />
        ) : null}
        <ShowDataDialog
          columns={columns}
          rows={previewRows}
          total={rows.length}
        />
      </div>

      {model.warnings.length > 0 ? (
        <div className="mt-2.5 flex items-start gap-2 border-t border-[var(--dashboard-hairline)] pt-2.5 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle
            aria-hidden="true"
            className="mt-0.5 size-4 shrink-0"
          />
          <div>
            <span className="font-semibold">Data quality:</span>{" "}
            {model.warnings.map((warning) => warning.message).join(" ")}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DateRangeFilter({
  available,
  column,
  range,
  onRangeChange,
}: {
  available: DashboardDateRange;
  column: string;
  range: DashboardDateRange | null;
  onRangeChange: (range: DashboardDateRange | null) => void;
}) {
  const active = range ?? available;
  const update = (patch: Partial<DashboardDateRange>) => {
    onRangeChange({ ...active, ...patch });
  };

  return (
    <fieldset
      className="flex flex-wrap items-end gap-1.5 sm:ms-auto"
      aria-label={`Filter by ${column}`}
    >
      <legend className="sr-only">Date range</legend>
      <CalendarRange aria-hidden="true" className="mb-2 size-3.5" />
      <label className="grid gap-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        From
        <input
          type="date"
          min={available.from}
          max={active.to}
          value={active.from}
          onChange={(event) => update({ from: event.target.value })}
          className="h-8 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-paper)] px-2 text-xs font-medium normal-case tracking-normal text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      <label className="grid gap-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
        To
        <input
          type="date"
          min={active.from}
          max={available.to}
          value={active.to}
          onChange={(event) => update({ to: event.target.value })}
          className="h-8 rounded-lg border border-[var(--dashboard-hairline)] bg-[var(--dashboard-paper)] px-2 text-xs font-medium normal-case tracking-normal text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>
      {range ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs"
          onClick={() => onRangeChange(null)}
        >
          Reset
        </Button>
      ) : null}
    </fieldset>
  );
}

function ShowDataDialog({
  columns,
  rows,
  total,
}: {
  columns: string[];
  rows: SerializedRow[];
  total: number;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-lg px-3 text-xs shadow-none"
        >
          Show data
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-[min(72rem,calc(100vw-2rem))] overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Underlying data</DialogTitle>
          <DialogDescription>
            {total.toLocaleString()} rows match the current date range.
          </DialogDescription>
        </DialogHeader>
        <div className="overflow-auto px-6 pb-6">
          <Table>
            <TableCaption>
              {total > 100
                ? `Showing the first 100 of ${total.toLocaleString()} rows.`
                : `Showing all ${total.toLocaleString()} rows.`}
            </TableCaption>
            <TableHeader>
              <TableRow>
                {columns.map((column) => (
                  <TableHead key={column} scope="col">
                    {column}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => (
                    <TableCell key={column}>
                      {displayValue(row[column])}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
