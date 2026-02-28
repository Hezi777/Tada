"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpDown,
  ChevronDown,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  Search,
  Table,
  Trash2,
  Upload,
  UploadCloud,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { removeChainedDatasetFile, uploadChainedDataset } from "@/lib/api";
import { applyDatasetChainSnapshot, useDashboardStore } from "@/lib/dashboard-store";

type FileView = "card" | "list";
type SortKey = "name" | "date" | "rows" | "type";

const SORT_LABELS: Record<SortKey, string> = {
  name: "Name",
  date: "Date",
  rows: "Rows",
  type: "Type",
};

function formatApiMessage(message: string): string {
  return message.includes("_") ? message.replace(/_/g, " ") : message;
}

function formatRowCount(count: number): string {
  return `${count.toLocaleString()} rows`;
}

function formatUploadedDate(value: string | null): string {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatUploadedDateShort(value: string | null): string {
  const date = value ? new Date(value) : new Date();
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getFileKind(fileName: string): "csv" | "excel" {
  return fileName.toLowerCase().endsWith(".csv") ? "csv" : "excel";
}

function getFileExtensionLabel(fileName: string): string {
  return getFileKind(fileName) === "csv" ? "CSV" : "XLSX";
}

/* ─── Card-style file icon (large, for card view) ─── */
function FileCardIcon({ fileName }: { fileName: string }) {
  const kind = getFileKind(fileName);
  const isCsv = kind === "csv";
  const Icon = isCsv ? FileText : Table;

  return (
    <div className="relative flex h-[120px] items-center justify-center bg-gradient-to-b from-[#F8FAFF] to-[#EEF2FF]">
      {/* Decorative page shape behind icon */}
      <div className="flex h-[72px] w-[56px] flex-col items-center justify-center rounded-[6px] bg-white shadow-[0_2px_8px_rgba(99,102,241,0.10)]">
        <Icon
          className={`h-7 w-7 ${isCsv ? "text-[#6366F1]" : "text-[#16A34A]"}`}
        />
      </div>
    </div>
  );
}

/* ─── Compact row icon (for list view) ─── */
function FileRowIcon({ fileName }: { fileName: string }) {
  const kind = getFileKind(fileName);
  const isCsv = kind === "csv";
  const Icon = isCsv ? FileText : Table;

  return (
    <span
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${isCsv
          ? "bg-[#EEF2FF] text-[#6366F1]"
          : "bg-[#F0FDF4] text-[#16A34A]"
        }`}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

export function FileManager() {
  const datasetId = useDashboardStore((snapshot) => snapshot.datasetId);
  const files = useDashboardStore((snapshot) => snapshot.files);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const uploadDatesRef = useRef<Record<string, string>>({});
  const [view, setView] = useState<FileView>("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date().toISOString();
    for (const file of files) {
      if (!uploadDatesRef.current[file.id]) {
        uploadDatesRef.current[file.id] = now;
      }
    }
  }, [files]);

  const primaryFile = useMemo(
    () => files.find((file) => file.isPrimary) ?? files[0] ?? null,
    [files],
  );

  const pendingRemoveFile = useMemo(
    () => files.find((file) => file.id === pendingRemoveId) ?? null,
    [files, pendingRemoveId],
  );

  const visibleFiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    let filtered = files;
    if (query) {
      filtered = files.filter((file) =>
        file.fileName.toLowerCase().includes(query),
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.fileName.localeCompare(b.fileName);
        case "date": {
          const da = uploadDatesRef.current[a.id] ?? "";
          const db = uploadDatesRef.current[b.id] ?? "";
          return db.localeCompare(da); // newest first
        }
        case "rows":
          return b.rowCount - a.rowCount;
        case "type": {
          const ta = a.isPrimary ? 0 : 1;
          const tb = b.isPrimary ? 0 : 1;
          return ta - tb;
        }
        default:
          return 0;
      }
    });

    return sorted;
  }, [files, searchQuery, sortKey]);

  async function handleAddFile(file: File) {
    if (!datasetId) {
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    try {
      const snapshot = await uploadChainedDataset({ datasetId, file });
      applyDatasetChainSnapshot(snapshot);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? formatApiMessage(error.message)
          : "Unable to add that file to the current dataset.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRemoveFile(fileId: string) {
    if (!datasetId) {
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);
    try {
      const snapshot = await removeChainedDatasetFile({ datasetId, fileId });
      applyDatasetChainSnapshot(snapshot);
      setPendingRemoveId(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? formatApiMessage(error.message)
          : "Unable to remove that chained file.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col p-6">
        <div className="dashboard-surface flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          {/* ───── Toolbar ───── */}
          <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
            {/* Left: Upload + Search */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                className="gap-2 rounded-lg bg-[#6366F1] px-4 text-white shadow-sm hover:bg-[#4F46E5]"
                onClick={() => inputRef.current?.click()}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                Upload
              </Button>

              <div className="relative w-56">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search folder or file"
                  className="h-9 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] pl-9 pr-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white"
                />
              </div>
            </div>

            {/* Right: Sort + View toggle */}
            <div className="flex items-center gap-3">
              {/* Sort By */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 gap-1.5 rounded-lg border-[#E2E8F0] px-3 text-sm font-medium text-[#475569]"
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    Sort by
                    <ChevronDown className="h-3.5 w-3.5 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-36">
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                    <DropdownMenuItem
                      key={key}
                      className={sortKey === key ? "bg-[#EEF2FF] text-[#6366F1] font-medium" : ""}
                      onSelect={() => setSortKey(key)}
                    >
                      {SORT_LABELS[key]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Separator orientation="vertical" className="h-6 bg-[#E2E8F0]" />

              {/* View toggles */}
              <div className="flex items-center gap-1 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${view === "card"
                          ? "bg-white text-[#6366F1] shadow-sm"
                          : "text-[#94A3B8] hover:text-[#64748B]"
                        }`}
                      onClick={() => setView("card")}
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Card view</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors ${view === "list"
                          ? "bg-white text-[#6366F1] shadow-sm"
                          : "text-[#94A3B8] hover:text-[#64748B]"
                        }`}
                      onClick={() => setView("list")}
                    >
                      <List className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>List view</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <Separator className="bg-[#F1F5F9]" />

          {/* Hidden file input */}
          <Input
            ref={inputRef}
            type="file"
            accept=".csv,.xls,.xlsx"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) {
                await handleAddFile(file);
              }
            }}
          />

          {/* Error banner */}
          {errorMessage ? (
            <div className="px-6 pt-4">
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {errorMessage}
              </div>
            </div>
          ) : null}

          {/* ───── Content Area ───── */}
          {visibleFiles.length === 0 ? (
            <div className="mt-20 flex flex-1 items-start justify-center px-6 py-8">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EEF2FF]">
                  <UploadCloud className="h-8 w-8 text-[#6366F1]" />
                </div>
                <h2 className="mt-5 text-lg font-semibold text-[#0F172A]">
                  {files.length === 0 ? "No files yet" : "No matching files"}
                </h2>
                <p className="mt-2 max-w-xs text-sm text-[#64748B]">
                  {files.length === 0
                    ? "Upload a CSV or Excel file to generate your dashboard"
                    : "Try a different search term to find your file"}
                </p>
                {files.length === 0 ? (
                  <Button
                    type="button"
                    className="mt-6 gap-2 rounded-lg bg-[#6366F1] text-white hover:bg-[#4F46E5]"
                    onClick={() => inputRef.current?.click()}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    Upload file
                  </Button>
                ) : null}
              </div>
            </div>
          ) : view === "card" ? (
            /* ───── Card View ───── */
            <div className="dashboard-scroll flex-1 overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {visibleFiles.map((file) => (
                  <div
                    key={file.id}
                    className="group relative overflow-hidden rounded-xl border border-[#E8ECF4] bg-white transition-all duration-200 hover:border-[#C7D2FE] hover:shadow-[0_4px_16px_rgba(99,102,241,0.08)]"
                  >
                    {/* Three-dot menu overlay */}
                    <div className="absolute right-2 top-2 z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/80 text-[#94A3B8] opacity-0 backdrop-blur-sm transition-all hover:bg-white hover:text-[#475569] group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {file.isPrimary ? (
                            <DropdownMenuItem disabled>
                              Primary — cannot remove
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="gap-2 text-red-600 focus:text-red-600"
                              onSelect={() => setPendingRemoveId(file.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove file
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Icon area */}
                    <FileCardIcon fileName={file.fileName} />

                    {/* Info area */}
                    <div className="space-y-1 px-3.5 pb-3.5 pt-3">
                      <p className="truncate text-[13px] font-semibold text-[#0F172A]">
                        {file.fileName}
                      </p>
                      <p className="text-xs text-[#94A3B8]">
                        {getFileExtensionLabel(file.fileName)},{" "}
                        {formatRowCount(file.rowCount)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ───── List View ───── */
            <div className="dashboard-scroll flex-1 overflow-y-auto px-6 py-5">
              <div className="overflow-hidden rounded-xl border border-[#E8ECF4] bg-white">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#F1F5F9] text-left">
                      <th className="w-8 px-4 py-3" />
                      <th className="px-4 py-3 text-xs font-medium text-[#94A3B8]">
                        Name
                      </th>
                      <th className="px-4 py-3 text-xs font-medium text-[#94A3B8]">
                        Last modified
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-[#94A3B8]">
                        Size
                      </th>
                      <th className="w-11 px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {visibleFiles.map((file) => (
                      <tr
                        key={file.id}
                        className="group h-[52px] border-b border-[#F1F5F9] transition-colors last:border-b-0 hover:bg-[#FAFAFB]"
                      >
                        {/* Icon */}
                        <td className="px-4 py-2">
                          <FileRowIcon fileName={file.fileName} />
                        </td>

                        {/* Name */}
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium text-[#0F172A]">
                              {file.fileName}
                            </span>
                            {file.isPrimary && (
                              <Badge className="border-0 bg-[#EEF2FF] text-[10px] font-semibold text-[#6366F1] hover:bg-[#EEF2FF]">
                                Primary
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Last modified */}
                        <td className="whitespace-nowrap px-4 py-2 text-[#64748B]">
                          {formatUploadedDate(
                            uploadDatesRef.current[file.id] ?? null,
                          )}
                        </td>

                        {/* Size (rows) */}
                        <td className="whitespace-nowrap px-4 py-2 text-right text-[#64748B]">
                          {formatRowCount(file.rowCount)}
                        </td>

                        {/* Delete action */}
                        <td className="px-4 py-2 text-right">
                          {!file.isPrimary ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#CBD5E1] opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                                  onClick={() => setPendingRemoveId(file.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Remove file</TooltipContent>
                            </Tooltip>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* ───── Remove confirmation dialog ───── */}
        <AlertDialog
          open={Boolean(pendingRemoveFile)}
          onOpenChange={(open) => {
            if (!open) {
              setPendingRemoveId(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove file?</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingRemoveFile
                  ? `This will remove "${pendingRemoveFile.fileName}" from the current dataset.`
                  : "This action cannot be undone."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 text-white hover:bg-red-700"
                onClick={() => {
                  if (pendingRemoveFile) {
                    void handleRemoveFile(pendingRemoveFile.id);
                  }
                }}
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

