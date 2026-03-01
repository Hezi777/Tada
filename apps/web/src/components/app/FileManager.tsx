"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronDown,
  FileText,
  LayoutGrid,
  List,
  Loader2,
  MoreHorizontal,
  Palette,
  Pencil,
  Plus,
  Search,
  Smile,
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
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  listDashboards,
  createDashboard,
  updateDashboard,
  deleteDashboard,
  uploadToDashboard,
  removeFileFromDashboard,
  loadDashboard,
  loadDashboardMeta,
} from "@/lib/api";
import { AnimatePresence, motion } from "framer-motion";
import {
  initializeDashboardStore,
  setActiveDashboard,
  useDashboardStore,
  getCachedDashboard,
} from "@/lib/dashboard-store";
import CreateDashboardModal, {
  getIconComponent,
} from "@/components/app/CreateDashboardModal";

const LOADING_PHRASES = [
  "Reading your data...",
  "Finding patterns...",
  "Crunching numbers...",
  "Connecting the dots...",
  "Sifting through rows...",
  "Detecting anomalies...",
  "Building charts...",
  "Analyzing metrics...",
  "Generating insights...",
  "Polishing pixels...",
  "Extracting value...",
  "Doing the math...",
  "Looking for trends...",
  "Structuring datasets...",
  "Processing files...",
  "Preparing your dashboard...",
  "Applying intelligence...",
  "Assembling views...",
  "Almost there...",
  "Finalizing setup...",
];

function AnimatedLoadingText() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % LOADING_PHRASES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-5 w-[130px] overflow-hidden text-left font-medium">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 flex items-center"
        >
          {LOADING_PHRASES[index]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
import {
  DASHBOARD_ICON_OPTIONS,
  DASHBOARD_COLOR_OPTIONS,
  type DashboardListItem,
} from "@tada/shared";

type View = "dashboards" | "files";
type FileView = "card" | "list";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatApiMessage(message: string): string {
  return message.includes("_") ? message.replace(/_/g, " ") : message;
}

// ── File item for the scoped file view ──

type ScopedFile = {
  id: string;
  fileName: string;
  rowCount: number;
  isPrimary: boolean;
};

// ── Main component ──

export default function FileManager() {
  // ── Top-level: dashboards vs scoped files ──
  const [view, setView] = useState<View>("dashboards");
  const [dashboards, setDashboards] = useState<DashboardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // ── Scoped file view state ──
  const [activeDash, setActiveDash] = useState<DashboardListItem | null>(null);
  const [scopedFiles, setScopedFiles] = useState<ScopedFile[]>([]);
  const [fileView, setFileView] = useState<FileView>("card");
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Rename / edit popovers ──
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteFileConfirm, setDeleteFileConfirm] = useState<ScopedFile | null>(null);

  // ── Icon / color pickers ──
  const [iconPickerId, setIconPickerId] = useState<string | null>(null);
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);

  // ── Load dashboards ──
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await listDashboards();
      setDashboards(items);
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ── Handlers: dashboard CRUD ──

  async function handleCreate(input: {
    name: string;
    icon: string;
    color: string;
  }) {
    try {
      const created = await createDashboard(input);
      setDashboards((prev) => [created, ...prev]);
      setCreateOpen(false);
      // Drill into the new dashboard
      handleDrillIn(created);
    } catch {
      // silent
    }
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) return;
    try {
      await updateDashboard(id, { name: renameValue.trim() });
      setDashboards((prev) =>
        prev.map((d) =>
          d.id === id ? { ...d, name: renameValue.trim() } : d,
        ),
      );
      setRenamingId(null);
    } catch {
      // silent
    }
  }

  async function handleChangeIcon(id: string, icon: string) {
    try {
      await updateDashboard(id, { icon });
      setDashboards((prev) =>
        prev.map((d) => (d.id === id ? { ...d, icon } : d)),
      );
      setIconPickerId(null);
    } catch {
      // silent
    }
  }

  async function handleChangeColor(id: string, color: string) {
    try {
      await updateDashboard(id, { color });
      setDashboards((prev) =>
        prev.map((d) => (d.id === id ? { ...d, color } : d)),
      );
      setColorPickerId(null);
    } catch {
      // silent
    }
  }

  async function handleDeleteDashboard() {
    if (!deleteConfirmId) return;
    try {
      await deleteDashboard(deleteConfirmId);
      setDashboards((prev) => prev.filter((d) => d.id !== deleteConfirmId));
      setDeleteConfirmId(null);
    } catch {
      // silent
    }
  }

  // ── Drill into a dashboard's files ──

  async function handleDrillIn(dash: DashboardListItem) {
    setActiveDash(dash);
    setView("files");
    setSearchQuery("");
    setUploadError(null);

    // If we already have the full dashboard in memory, use it instantly
    const cached = getCachedDashboard(dash.id);
    if (cached) {
      setScopedFiles(
        cached.files.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          rowCount: f.rowCount,
          isPrimary: true,
        }))
      );
      return;
    }

    try {
      const result = await loadDashboardMeta(dash.id);
      if ("empty" in result) {
        setScopedFiles([]);
      } else {
        setScopedFiles(result.files);
      }
    } catch {
      setScopedFiles([]);
    }
  }

  function handleBack() {
    setView("dashboards");
    setActiveDash(null);
    setScopedFiles([]);
    refresh();
  }

  // ── File operations scoped to a dashboard ──

  async function handleUploadFile(file: File) {
    if (!activeDash) return;
    setIsUploading(true);
    setUploadError(null);
    try {
      const result = await uploadToDashboard(activeDash.id, file);
      setScopedFiles(
        result.files.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          rowCount: f.rowCount,
          isPrimary: f.isPrimary,
        })),
      );
      // Update the dashboard store so the chart view is current
      initializeDashboardStore(result, {
        id: activeDash.id,
        name: activeDash.name,
        icon: activeDash.icon,
        color: activeDash.color,
      });
      setActiveDashboard({
        id: activeDash.id,
        name: activeDash.name,
        icon: activeDash.icon,
        color: activeDash.color,
      });
    } catch (err) {
      setUploadError(
        err instanceof Error ? formatApiMessage(err.message) : "Upload failed",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveFile() {
    if (!deleteFileConfirm || !activeDash) return;
    try {
      await removeFileFromDashboard(activeDash.id, deleteFileConfirm.id);
      setScopedFiles((prev) =>
        prev.filter((f) => f.id !== deleteFileConfirm.id),
      );
      setDeleteFileConfirm(null);
    } catch {
      // silent
    }
  }

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return scopedFiles;
    const q = searchQuery.toLowerCase();
    return scopedFiles.filter((f) =>
      f.fileName.toLowerCase().includes(q),
    );
  }, [scopedFiles, searchQuery]);

  // ── RENDER: Dashboard card grid ──

  if (view === "dashboards") {
    return (
      <div className="flex h-full flex-col overflow-hidden">
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5">
          <h1 className="font-display text-[20px] text-[var(--color-text-primary)]">
            Dashboards
          </h1>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--color-text-muted)]" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {dashboards.map((dash) => {
                const IconComp = getIconComponent(dash.icon);
                return (
                  <Card
                    key={dash.id}
                    className="group relative cursor-pointer overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]"
                    onClick={() => handleDrillIn(dash)}
                  >
                    {/* Colored header area */}
                    <div
                      className="flex h-[72px] items-center justify-center"
                      style={{ backgroundColor: dash.color + "18" }}
                    >
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-[14px]"
                        style={{
                          backgroundColor: dash.color + "30",
                          color: dash.color,
                        }}
                      >
                        <IconComp className="h-6 w-6" />
                      </div>
                    </div>

                    {/* Body */}
                    <div className="px-4 pb-4 pt-3">
                      {/* Inline rename */}
                      {renamingId === dash.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRename(dash.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="mb-1"
                        >
                          <Input
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            className="h-7 text-sm font-semibold"
                            onBlur={() => handleRename(dash.id)}
                            autoFocus
                          />
                        </form>
                      ) : (
                        <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                          {dash.name}
                        </p>
                      )}

                      <div className="mt-1.5 flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
                        <span>
                          {dash.fileCount} {dash.fileCount === 1 ? "file" : "files"}
                        </span>
                        <span>·</span>
                        <span>{formatDate(dash.updatedAt)}</span>
                      </div>
                    </div>

                    {/* ⋯ menu */}
                    <div
                      className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-full bg-white/80 text-[var(--color-text-muted)] shadow-sm backdrop-blur-sm hover:bg-white"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem
                            onSelect={() => {
                              setRenamingId(dash.id);
                              setRenameValue(dash.name);
                            }}
                          >
                            <Pencil className="mr-2 h-3.5 w-3.5" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              setIconPickerId(
                                iconPickerId === dash.id ? null : dash.id,
                              )
                            }
                          >
                            <Smile className="mr-2 h-3.5 w-3.5" />
                            Change Icon
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              setColorPickerId(
                                colorPickerId === dash.id ? null : dash.id,
                              )
                            }
                          >
                            <Palette className="mr-2 h-3.5 w-3.5" />
                            Change Color
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              setDeleteConfirmId(dash.id);
                              setDeleteConfirmName(dash.name);
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-3.5 w-3.5" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Icon picker popover */}
                    {iconPickerId === dash.id && (
                      <div
                        className="absolute right-2 top-10 z-10 rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="grid grid-cols-5 gap-1.5">
                          {DASHBOARD_ICON_OPTIONS.map((iconName) => {
                            const IC = getIconComponent(iconName);
                            return (
                              <button
                                key={iconName}
                                type="button"
                                onClick={() => handleChangeIcon(dash.id, iconName)}
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${iconName === dash.icon
                                  ? "bg-blue-50 text-[#3B82F6]"
                                  : "text-[var(--color-text-muted)] hover:bg-slate-50"
                                  }`}
                              >
                                <IC className="h-4 w-4" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Color picker popover */}
                    {colorPickerId === dash.id && (
                      <div
                        className="absolute right-2 top-10 z-10 rounded-xl border border-[var(--color-border)] bg-white p-3 shadow-lg"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex gap-1.5">
                          {DASHBOARD_COLOR_OPTIONS.map((color) => (
                            <button
                              key={color}
                              type="button"
                              onClick={() => handleChangeColor(dash.id, color)}
                              className={`h-7 w-7 rounded-full transition-all ${color === dash.color
                                ? "ring-2 ring-offset-1"
                                : "hover:scale-110"
                                }`}
                              style={{
                                backgroundColor: color,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}

              {/* + New Dashboard card */}
              <Card
                className="flex h-full min-h-[148px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-border)] bg-transparent transition-all duration-200 hover:border-[#3B82F6] hover:bg-blue-50/30"
                onClick={() => setCreateOpen(true)}
              >
                <div className="flex flex-col items-center gap-2 text-[var(--color-text-muted)]">
                  <Plus className="h-8 w-8" />
                  <span className="text-sm font-medium">New Dashboard</span>
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Create modal */}
        <CreateDashboardModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreate}
        />

        {/* Delete confirmation */}
        <AlertDialog
          open={!!deleteConfirmId}
          onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete dashboard</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deleteConfirmName}&quot;?
                This will remove the dashboard and unlink all attached files. The
                files themselves will not be deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteDashboard}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  // ── RENDER: Scoped file view (drilled into a dashboard) ──

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header with back arrow */}
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5">
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="h-8 w-8 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)] hover:text-[#3B82F6]"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Back to dashboards</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {activeDash && (
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{
                backgroundColor: activeDash.color + "20",
                color: activeDash.color,
              }}
            >
              {(() => {
                const IC = getIconComponent(activeDash.icon);
                return <IC className="h-3.5 w-3.5" />;
              })()}
            </div>
            <h1 className="font-display text-[16px] text-[var(--color-text-primary)]">
              {activeDash.name}
            </h1>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" />
            <Input
              placeholder="Search files…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 w-48 rounded-lg border-[var(--color-border)] bg-[var(--color-bg)] pl-8 text-xs"
            />
          </div>

          {/* View toggle */}
          <div className="flex gap-0.5 rounded-lg border border-[var(--color-border)] p-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFileView("card")}
              className={`h-7 w-7 rounded-md ${fileView === "card"
                ? "bg-[#3B82F6] text-white"
                : "text-[var(--color-text-muted)]"
                }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setFileView("list")}
              className={`h-7 w-7 rounded-md ${fileView === "list"
                ? "bg-[#3B82F6] text-white"
                : "text-[var(--color-text-muted)]"
                }`}
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Upload button */}
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className={`relative h-8 overflow-hidden rounded-lg bg-[#3B82F6] px-0 text-xs font-medium text-white hover:bg-[#2563EB] transition-[width] duration-300 ${isUploading ? "w-[170px]" : "w-24"
              }`}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {isUploading ? (
                <motion.div
                  key="uploading"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                  className="absolute inset-0 flex items-center justify-center gap-1.5"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <AnimatedLoadingText />
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -20, opacity: 0 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                  className="absolute inset-0 flex items-center justify-center gap-1.5"
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload</span>
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUploadFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      {/* Error banner */}
      {uploadError && (
        <div className="border-b border-red-200 bg-red-50 px-5 py-2 text-xs text-red-700">
          {uploadError}
        </div>
      )}

      {/* File grid / list */}
      <div className="flex-1 overflow-y-auto p-5">
        {filteredFiles.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-blue-50 text-[#3B82F6]">
              <UploadCloud className="h-7 w-7" />
            </div>
            <h2 className="font-display text-lg text-[var(--color-text-primary)]">
              No files yet
            </h2>
            <p className="max-w-xs text-sm text-[var(--color-text-muted)]">
              Upload a CSV or Excel file to start building charts for this
              dashboard.
            </p>
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`relative mt-2 h-9 overflow-hidden rounded-lg bg-[#3B82F6] px-0 text-sm text-white hover:bg-[#2563EB] transition-[width] duration-300 ${isUploading ? "w-[180px]" : "w-32"
                }`}
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {isUploading ? (
                  <motion.div
                    key="uploading"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    className="absolute inset-0 flex items-center justify-center gap-2"
                  >
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <AnimatedLoadingText />
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    className="absolute inset-0 flex items-center justify-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload File</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
          </div>
        ) : fileView === "card" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredFiles.map((f) => (
              <Card
                key={f.id}
                className="group relative overflow-hidden rounded-xl border border-[var(--color-border)] bg-white p-4 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)]"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#3B82F6]">
                    {f.fileName.endsWith(".csv") ? (
                      <Table className="h-5 w-5" />
                    ) : (
                      <FileText className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                      {f.fileName}
                    </p>
                    <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--color-text-muted)]">
                      <span>{f.rowCount.toLocaleString()} rows</span>
                      {f.isPrimary && (
                        <Badge className="rounded bg-[#3B82F6]/10 px-1.5 py-0 text-[10px] font-medium text-[#3B82F6]">
                          Primary
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delete on hover */}
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteFileConfirm(f)}
                    className="h-7 w-7 rounded-full text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredFiles.map((f) => (
              <div
                key={f.id}
                className="group flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-slate-50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-[#3B82F6]">
                  {f.fileName.endsWith(".csv") ? (
                    <Table className="h-4 w-4" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                </div>
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text-primary)]">
                  {f.fileName}
                </span>
                <span className="text-[11px] text-[var(--color-text-muted)]">
                  {f.rowCount.toLocaleString()} rows
                </span>
                {f.isPrimary && (
                  <Badge className="rounded bg-[#3B82F6]/10 px-1.5 py-0 text-[10px] font-medium text-[#3B82F6]">
                    Primary
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteFileConfirm(f)}
                  className="h-7 w-7 rounded-full text-[var(--color-text-muted)] opacity-0 hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete file confirmation */}
      <AlertDialog
        open={!!deleteFileConfirm}
        onOpenChange={(open) => !open && setDeleteFileConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove file</AlertDialogTitle>
            <AlertDialogDescription>
              Remove &quot;{deleteFileConfirm?.fileName}&quot; from this
              dashboard? The underlying data will remain in your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFile}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
