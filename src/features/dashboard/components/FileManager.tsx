"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  LayoutGrid,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Smile,
  Table,
  Trash2,
  Upload,
  UploadCloud,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { Input } from "@/shared/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { Skeleton } from "@/shared/ui/skeleton";
import { useToast } from "@/shared/hooks/use-toast";
import {
  createDashboard,
  deleteDashboard,
  listDashboards,
  loadDashboardMeta,
  removeFileFromDashboard,
  updateDashboard,
  uploadToDashboard,
} from "@/shared/lib/api";
import { formatDateIL } from "@/shared/lib/format";
import {
  clearActiveDashboard,
  getCachedDashboard,
  initializeDashboardStore,
  resetDashboardStore,
  setActiveDashboard,
} from "@/features/dashboard/client/store";
import CreateDashboardModal, {
  getIconComponent,
} from "@/features/dashboard/components/CreateDashboardModal";
import {
  DASHBOARD_COLOR_OPTIONS,
  DASHBOARD_ICON_OPTIONS,
  type DashboardListItem,
} from "@/shared/contracts";

type View = "dashboards" | "files";
type SortMode = "updated" | "name" | "files";

type ScopedFile = {
  id: string;
  fileName: string;
  rowCount: number;
  isPrimary: boolean;
};

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
];

const DASHBOARD_TINTS = ["#f0fff4", "#fff0f0", "#f0f4ff", "#f5f0ff", "#fffbf0"];

const PAGE_SIZE = 6;

function AnimatedLoadingText() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((current) => (current + 1) % LOADING_PHRASES.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-5 w-[150px] overflow-hidden text-left font-medium">
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

function formatApiMessage(message: string): string {
  return message.includes("_") ? message.replace(/_/g, " ") : message;
}

function DashboardPreview({ index }: { index: number }) {
  const pattern = index % 5;

  if (pattern === 0) {
    return (
      <div className="grid h-full grid-cols-3 grid-rows-2 gap-3">
        <div className="col-span-2 flex items-end rounded-2xl bg-white/50 p-4">
          <div className="flex h-full w-full items-end gap-1.5">
            <div className="h-[55%] flex-1 rounded-t-full bg-[rgba(0,50,125,0.16)]" />
            <div className="h-[78%] flex-1 rounded-t-full bg-[rgba(0,50,125,0.16)]" />
            <div className="h-[46%] flex-1 rounded-t-full bg-[rgba(0,50,125,0.16)]" />
            <div className="h-full flex-1 rounded-t-full bg-[rgba(0,50,125,0.16)]" />
          </div>
        </div>
        <div className="flex items-center justify-center rounded-2xl bg-white/45">
          <div className="h-10 w-10 rounded-full border-4 border-[rgba(0,50,125,0.16)] border-t-transparent" />
        </div>
        <div className="col-span-3 rounded-2xl bg-white/45 p-4">
          <div className="h-2 rounded-full bg-[rgba(0,50,125,0.08)]">
            <div className="h-full w-2/3 rounded-full bg-[rgba(0,50,125,0.2)]" />
          </div>
        </div>
      </div>
    );
  }

  if (pattern === 1) {
    return (
      <div className="grid h-full grid-cols-4 grid-rows-2 gap-3">
        <div className="row-span-2 flex items-center justify-center rounded-2xl bg-white/50">
          <div className="rounded-2xl bg-[rgba(0,50,125,0.08)] p-3">
            <LayoutGrid className="h-7 w-7 text-[rgba(0,50,125,0.24)]" />
          </div>
        </div>
        <div className="col-span-3 rounded-2xl bg-white/45 p-4">
          <div className="space-y-2">
            <div className="h-2 w-3/4 rounded-full bg-[rgba(0,50,125,0.12)]" />
            <div className="h-2 w-1/2 rounded-full bg-[rgba(0,50,125,0.08)]" />
          </div>
        </div>
        <div className="col-span-3 grid grid-cols-3 gap-2 rounded-2xl bg-white/45 p-3">
          <div className="rounded-xl bg-[rgba(0,50,125,0.06)]" />
          <div className="rounded-xl bg-[rgba(0,50,125,0.12)]" />
          <div className="rounded-xl bg-[rgba(0,50,125,0.18)]" />
        </div>
      </div>
    );
  }

  if (pattern === 2) {
    return (
      <div className="flex h-full flex-col gap-3">
        <div className="flex flex-1 items-center justify-between rounded-2xl bg-white/50 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(0,50,125,0.1)]">
            <Search className="h-5 w-5 text-[rgba(0,50,125,0.28)]" />
          </div>
          <div className="space-y-2">
            <div className="h-3 w-16 rounded-full bg-[rgba(0,50,125,0.12)]" />
            <div className="h-2 w-24 rounded-full bg-[rgba(0,50,125,0.08)]" />
          </div>
        </div>
        <div className="grid flex-1 grid-cols-2 gap-3">
          <div className="rounded-2xl bg-white/45" />
          <div className="rounded-2xl bg-white/45" />
        </div>
      </div>
    );
  }

  if (pattern === 3) {
    return (
      <div className="grid h-full grid-cols-2 gap-3">
        <div className="flex items-center justify-center rounded-2xl bg-white/50">
          <div className="h-14 w-14 rounded-full bg-[rgba(0,50,125,0.1)]" />
        </div>
        <div className="space-y-2 rounded-2xl bg-white/45 p-4">
          <div className="h-2 rounded-full bg-[rgba(0,50,125,0.12)]" />
          <div className="h-2 rounded-full bg-[rgba(0,50,125,0.12)]" />
          <div className="h-2 w-2/3 rounded-full bg-[rgba(0,50,125,0.12)]" />
        </div>
        <div className="col-span-2 flex items-end gap-1 rounded-2xl bg-white/45 p-4">
          <div className="h-1/2 flex-1 rounded-t-2xl bg-[rgba(0,50,125,0.16)]" />
          <div className="h-3/4 flex-1 rounded-t-2xl bg-[rgba(0,50,125,0.16)]" />
          <div className="h-full flex-1 rounded-t-2xl bg-[rgba(0,50,125,0.16)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="grid h-1/3 grid-cols-3 gap-3">
        <div className="rounded-2xl bg-white/50" />
        <div className="rounded-2xl bg-white/50" />
        <div className="rounded-2xl bg-white/50" />
      </div>
      <div className="flex-1 space-y-3 rounded-2xl bg-white/50 p-4">
        <div className="h-2 rounded-full bg-[rgba(0,50,125,0.1)]" />
        <div className="h-2 w-5/6 rounded-full bg-[rgba(0,50,125,0.1)]" />
        <div className="h-2 w-4/6 rounded-full bg-[rgba(0,50,125,0.1)]" />
      </div>
    </div>
  );
}

export default function FileManager() {
  const { toast } = useToast();
  const [view, setView] = useState<View>("dashboards");
  const [dashboards, setDashboards] = useState<DashboardListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("updated");
  const [currentPage, setCurrentPage] = useState(1);
  const [isQuickUploading, setIsQuickUploading] = useState(false);

  const [activeDash, setActiveDash] = useState<DashboardListItem | null>(null);
  const [scopedFiles, setScopedFiles] = useState<ScopedFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const dashboardUploadInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteFileConfirm, setDeleteFileConfirm] = useState<ScopedFile | null>(
    null,
  );

  const [iconPickerId, setIconPickerId] = useState<string | null>(null);
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const items = await listDashboards();
      setDashboards(items);
    } catch {
      setDashboards([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const sortedDashboards = useMemo(() => {
    const items = [...dashboards];

    if (sortMode === "name") {
      items.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === "files") {
      items.sort((a, b) => b.fileCount - a.fileCount);
    } else {
      items.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
    }

    return items;
  }, [dashboards, sortMode]);

  const totalPages = Math.max(
    1,
    Math.ceil(sortedDashboards.length / PAGE_SIZE),
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const pagedDashboards = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return sortedDashboards.slice(start, start + PAGE_SIZE);
  }, [currentPage, sortedDashboards]);

  async function handleCreate(input: {
    name: string;
    icon: string;
    color: string;
  }) {
    try {
      const created = await createDashboard(input);
      setDashboards((prev) => [created, ...prev]);
      setCreateOpen(false);
    } catch {
      // Ignore create failures in the gallery view.
    }
  }

  async function handleQuickUpload(file: File) {
    setIsQuickUploading(true);

    try {
      const created = await createDashboard({
        name: file.name.replace(/\.[^.]+$/, ""),
        icon: "bar-chart",
        color: "#00327D",
      });
      const snapshot = await uploadToDashboard(created.id, file);

      const hydratedDashboard: DashboardListItem = {
        ...created,
        fileCount: snapshot.files.length,
        updatedAt: new Date().toISOString(),
      };

      setDashboards((prev) => [
        hydratedDashboard,
        ...prev.filter((item) => item.id !== hydratedDashboard.id),
      ]);

      initializeDashboardStore(snapshot, {
        id: hydratedDashboard.id,
        name: hydratedDashboard.name,
        icon: hydratedDashboard.icon,
        color: hydratedDashboard.color,
      });
      setActiveDashboard({
        id: hydratedDashboard.id,
        name: hydratedDashboard.name,
        icon: hydratedDashboard.icon,
        color: hydratedDashboard.color,
      });
      setActiveDash(hydratedDashboard);
      setScopedFiles(
        snapshot.files.map((item) => ({
          id: item.id,
          fileName: item.fileName,
          rowCount: item.rowCount,
          isPrimary: item.isPrimary,
        })),
      );
      setView("files");
    } catch (error) {
      const message =
        error instanceof Error
          ? formatApiMessage(error.message)
          : "Upload failed";
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: message,
      });
    } finally {
      setIsQuickUploading(false);
    }
  }

  async function handleRename(id: string) {
    if (!renameValue.trim()) {
      return;
    }

    try {
      await updateDashboard(id, { name: renameValue.trim() });
      setDashboards((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, name: renameValue.trim() } : item,
        ),
      );
      setActiveDash((current) =>
        current?.id === id ? { ...current, name: renameValue.trim() } : current,
      );
      setRenamingId(null);
    } catch {
      // Ignore rename failures in-place.
    }
  }

  async function handleChangeIcon(id: string, icon: string) {
    try {
      await updateDashboard(id, { icon });
      setDashboards((prev) =>
        prev.map((item) => (item.id === id ? { ...item, icon } : item)),
      );
      setActiveDash((current) =>
        current?.id === id ? { ...current, icon } : current,
      );
      setIconPickerId(null);
    } catch {
      // Ignore update failures in-place.
    }
  }

  async function handleChangeColor(id: string, color: string) {
    try {
      await updateDashboard(id, { color });
      setDashboards((prev) =>
        prev.map((item) => (item.id === id ? { ...item, color } : item)),
      );
      setActiveDash((current) =>
        current?.id === id ? { ...current, color } : current,
      );
      setColorPickerId(null);
    } catch {
      // Ignore update failures in-place.
    }
  }

  async function handleDeleteDashboard() {
    if (!deleteConfirmId) {
      return;
    }

    try {
      const deletingActiveDashboard = activeDash?.id === deleteConfirmId;
      await deleteDashboard(deleteConfirmId);
      setDashboards((prev) =>
        prev.filter((item) => item.id !== deleteConfirmId),
      );

      if (deletingActiveDashboard) {
        setView("dashboards");
        setActiveDash(null);
        setScopedFiles([]);
        clearActiveDashboard();
        resetDashboardStore();
      }

      setDeleteConfirmId(null);
    } catch {
      // Ignore delete failures in-place.
    }
  }

  async function handleDrillIn(dashboard: DashboardListItem) {
    setActiveDash(dashboard);
    setView("files");
    setSearchQuery("");

    const cached = getCachedDashboard(dashboard.id);
    if (cached) {
      setScopedFiles(
        cached.files.map((file) => ({
          id: file.id,
          fileName: file.fileName,
          rowCount: file.rowCount,
          isPrimary: true,
        })),
      );
      return;
    }

    try {
      const result = await loadDashboardMeta(dashboard.id);
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
    void refresh();
  }

  async function handleUploadFile(file: File) {
    if (!activeDash) {
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadToDashboard(activeDash.id, file);
      setScopedFiles(
        result.files.map((item) => ({
          id: item.id,
          fileName: item.fileName,
          rowCount: item.rowCount,
          isPrimary: item.isPrimary,
        })),
      );
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
      setDashboards((prev) =>
        prev.map((item) =>
          item.id === activeDash.id
            ? {
                ...item,
                fileCount: result.files.length,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? formatApiMessage(error.message)
          : "Upload failed";
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: message,
      });
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRemoveFile() {
    if (!deleteFileConfirm || !activeDash) {
      return;
    }

    try {
      await removeFileFromDashboard(activeDash.id, deleteFileConfirm.id);
      setScopedFiles((prev) =>
        prev.filter((file) => file.id !== deleteFileConfirm.id),
      );
      setDeleteFileConfirm(null);
    } catch {
      // Ignore file removal failures in-place.
    }
  }

  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) {
      return scopedFiles;
    }

    const query = searchQuery.toLowerCase();
    return scopedFiles.filter((file) =>
      file.fileName.toLowerCase().includes(query),
    );
  }, [scopedFiles, searchQuery]);

  if (view === "dashboards") {
    return (
      <div className="dashboard-scroll flex h-full flex-col overflow-y-auto bg-[var(--color-bg)] px-6 py-10 sm:px-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="font-display text-[2.25rem] font-bold tracking-[-0.05em] text-[var(--color-text-primary)]">
                My Dashboards
              </h1>
              <p className="mt-2 text-sm font-medium text-[var(--color-text-secondary)]">
                Manage and monitor your visual intelligence assets.
              </p>
            </div>

            <Button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="h-10 rounded-full bg-[var(--color-accent)] px-5 text-white hover:bg-[var(--color-accent-secondary)]"
            >
              <Plus className="h-4 w-4" />
              New Dashboard
            </Button>
          </div>

          <button
            type="button"
            onClick={() => dashboardUploadInputRef.current?.click()}
            disabled={isQuickUploading}
            className="flex w-full items-center justify-between rounded-[20px] border-2 border-dashed border-[var(--color-accent)] bg-card px-6 py-5 text-left transition-colors hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(0,50,125,0.08)] text-[var(--color-accent)]">
                {isQuickUploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
              </div>
              <div>
                <p className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                  Drop a CSV, Excel, or PDF file here
                </p>
                <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                  Uploading starts a new dashboard automatically.
                </p>
              </div>
            </div>
            <span className="rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white">
              Browse files
            </span>
          </button>
        </div>

        <input
          ref={dashboardUploadInputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.pdf"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) {
              void handleQuickUpload(file);
            }
          }}
        />

        <div className="mt-8 flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="h-10 rounded-full bg-[var(--color-surface-muted)] px-4 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-card hover:text-[var(--color-text-primary)]"
              >
                Sort by:{" "}
                {sortMode === "updated"
                  ? "Last Modified"
                  : sortMode === "name"
                    ? "Name"
                    : "File Count"}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 rounded-[16px] p-2"
            >
              <DropdownMenuItem onSelect={() => setSortMode("updated")}>
                <span className="flex-1">Last Modified</span>
                {sortMode === "updated" ? <Check className="h-4 w-4" /> : null}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSortMode("name")}>
                <span className="flex-1">Name</span>
                {sortMode === "name" ? <Check className="h-4 w-4" /> : null}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSortMode("files")}>
                <span className="flex-1">File Count</span>
                {sortMode === "files" ? <Check className="h-4 w-4" /> : null}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="aspect-[3/2] rounded-[20px]" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {pagedDashboards.map((dashboard, index) => {
                const IconComponent = getIconComponent(dashboard.icon);
                const tint = DASHBOARD_TINTS[index % DASHBOARD_TINTS.length];

                return (
                  <Card
                    key={dashboard.id}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        void handleDrillIn(dashboard);
                      }
                    }}
                    className="group relative flex aspect-[3/2] cursor-pointer flex-col overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-card shadow-[0_20px_40px_-32px_rgba(25,28,30,0.16)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_28px_60px_-30px_rgba(25,28,30,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
                    onClick={() => void handleDrillIn(dashboard)}
                  >
                    <div
                      className="relative min-h-0 flex-[1.3] p-6"
                      style={{ backgroundColor: tint }}
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/60 text-[var(--color-accent)]">
                          <IconComponent className="h-5 w-5" />
                        </div>

                        <div
                          className="flex items-center gap-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Popover
                            open={iconPickerId === dashboard.id}
                            onOpenChange={(open) =>
                              setIconPickerId(open ? dashboard.id : null)
                            }
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-white/80 text-[var(--color-text-secondary)] shadow-sm backdrop-blur-sm hover:bg-white"
                                aria-label="Change dashboard icon"
                              >
                                <Smile className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-72 p-3">
                              <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">
                                Choose icon
                              </div>
                              <div className="grid grid-cols-5 gap-1.5">
                                {DASHBOARD_ICON_OPTIONS.map((iconName) => {
                                  const OptionIcon = getIconComponent(iconName);
                                  return (
                                    <button
                                      key={iconName}
                                      type="button"
                                      onClick={() =>
                                        void handleChangeIcon(
                                          dashboard.id,
                                          iconName,
                                        )
                                      }
                                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
                                        iconName === dashboard.icon
                                          ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
                                          : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]"
                                      }`}
                                    >
                                      <OptionIcon className="h-4 w-4" />
                                    </button>
                                  );
                                })}
                              </div>
                            </PopoverContent>
                          </Popover>

                          <Popover
                            open={colorPickerId === dashboard.id}
                            onOpenChange={(open) =>
                              setColorPickerId(open ? dashboard.id : null)
                            }
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-white/80 shadow-sm backdrop-blur-sm hover:bg-white"
                                aria-label="Change dashboard color"
                              >
                                <span
                                  className="h-4 w-4 rounded-full border border-white/70 shadow-sm"
                                  style={{ backgroundColor: dashboard.color }}
                                />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-72 p-3">
                              <div className="mb-2 text-xs font-medium text-[var(--color-text-secondary)]">
                                Choose color
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {DASHBOARD_COLOR_OPTIONS.map((color) => (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={() =>
                                      void handleChangeColor(
                                        dashboard.id,
                                        color,
                                      )
                                    }
                                    className={`h-7 w-7 rounded-full border border-white/70 transition-all ${
                                      color === dashboard.color
                                        ? "ring-2 ring-[var(--color-accent)] ring-offset-1"
                                        : "hover:scale-110"
                                    }`}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </PopoverContent>
                          </Popover>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-full bg-white/80 text-[var(--color-text-secondary)] shadow-sm backdrop-blur-sm hover:bg-white"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onSelect={() => {
                                  setRenamingId(dashboard.id);
                                  setRenameValue(dashboard.name);
                                }}
                              >
                                <Pencil className="mr-2 h-3.5 w-3.5" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => {
                                  setDeleteConfirmId(dashboard.id);
                                  setDeleteConfirmName(dashboard.name);
                                }}
                                className="text-[var(--color-text-secondary)] focus:text-[var(--color-text-primary)]"
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <DashboardPreview index={index} />

                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-[var(--color-accent)] px-5 py-2 text-sm font-semibold text-white opacity-0 shadow-[0_18px_40px_-26px_rgba(0,50,125,0.7)] transition-all duration-200 group-hover:opacity-100">
                          Open Dashboard
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-center bg-card px-5 pb-5 pt-4">
                      {renamingId === dashboard.id ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            void handleRename(dashboard.id);
                          }}
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Input
                            value={renameValue}
                            onChange={(event) =>
                              setRenameValue(event.target.value)
                            }
                            className="h-9 rounded-[8px] border border-[rgba(25,28,30,0.12)] bg-card text-sm font-semibold"
                            onBlur={() => void handleRename(dashboard.id)}
                            autoFocus
                          />
                        </form>
                      ) : (
                        <h3 className="truncate font-display text-xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
                          {dashboard.name}
                        </h3>
                      )}

                      <p className="mt-2 text-sm font-medium tabular-nums text-[var(--color-text-secondary)]">
                        {dashboard.fileCount}{" "}
                        {dashboard.fileCount === 1 ? "file" : "files"} ·{" "}
                        {formatDateIL(dashboard.updatedAt)}
                      </p>
                    </div>
                  </Card>
                );
              })}

              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="group flex aspect-[3/2] flex-col items-center justify-center rounded-[20px] border-2 border-dashed border-[var(--color-border)] bg-card transition-all duration-300 hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-muted)]"
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] transition-colors group-hover:text-[var(--color-accent)]">
                  <Plus className="h-7 w-7" />
                </div>
                <span className="font-display text-lg font-bold tracking-[-0.03em] text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent)]">
                  Create New Dashboard
                </span>
              </button>
            </div>
          )}
        </div>

        <footer className="mt-14 flex flex-col gap-4 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-sm font-medium text-[var(--color-text-secondary)]">
            Showing {pagedDashboards.length} of {sortedDashboards.length}{" "}
            dashboards
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              className="h-9 w-9 rounded-full"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: totalPages }).map((_, pageIndex) => {
              const page = pageIndex + 1;
              const active = page === currentPage;

              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setCurrentPage(page)}
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[var(--color-accent)] text-white"
                      : "text-[var(--color-text-secondary)] hover:bg-card"
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              disabled={currentPage === totalPages}
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              className="h-9 w-9 rounded-full"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </footer>

        <CreateDashboardModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          onCreated={handleCreate}
        />

        <AlertDialog
          open={Boolean(deleteConfirmId)}
          onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete dashboard</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{deleteConfirmName}&quot;?
                This removes the dashboard and unlinks its attached files.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => void handleDeleteDashboard()}
                className="bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-secondary)]"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="dashboard-scroll flex h-full flex-col overflow-y-auto bg-[var(--color-bg)] px-6 py-8 sm:px-8">
      <div className="flex flex-col gap-5 rounded-[20px] border border-[var(--color-border)] bg-card px-6 py-6 shadow-[0_24px_48px_-36px_rgba(25,28,30,0.16)]">
        <div className="flex flex-wrap items-center gap-3">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  aria-label="Back to dashboards"
                  className="h-10 w-10 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Back to dashboards</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {activeDash ? (
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                {(() => {
                  const ActiveIcon = getIconComponent(activeDash.icon);
                  return <ActiveIcon className="h-5 w-5" />;
                })()}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                  Dashboard Assets
                </p>
                <h1 className="font-display text-[1.75rem] font-bold tracking-[-0.04em] text-[var(--color-text-primary)]">
                  {activeDash.name}
                </h1>
              </div>
            </div>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-10 w-56 rounded-full border border-transparent bg-[var(--color-surface-muted)] pl-10 text-sm"
              />
            </div>

            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="relative h-10 rounded-full bg-[var(--color-accent)] px-0 text-sm font-semibold text-white hover:bg-[var(--color-accent-secondary)] disabled:w-[200px]"
            >
              <AnimatePresence mode="popLayout" initial={false}>
                {isUploading ? (
                  <motion.div
                    key="uploading"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                    className="absolute inset-0 flex items-center justify-center gap-2 px-5"
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
                    className="absolute inset-0 flex items-center justify-center gap-2 px-5"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload File</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) {
                  void handleUploadFile(file);
                }
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-8 flex-1">
        {filteredFiles.length === 0 ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center rounded-[20px] border border-[var(--color-border)] bg-card px-6 py-10 text-center shadow-[0_24px_48px_-36px_rgba(25,28,30,0.16)]">
            <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-[var(--color-accent-light)] text-[var(--color-accent)]">
              <UploadCloud className="h-8 w-8" />
            </div>
            <h2 className="mt-6 font-display text-[1.875rem] font-bold tracking-[-0.04em] text-[var(--color-text-primary)]">
              {searchQuery.trim()
                ? "No files match your search"
                : "No files yet"}
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-7 text-[var(--color-text-secondary)]">
              {searchQuery.trim()
                ? "Try a different search term, or clear the search to see all files."
                : "Upload a CSV, Excel, or PDF file to start building charts for this dashboard."}
            </p>
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="mt-6 h-10 rounded-full bg-[var(--color-accent)] px-6 text-sm font-semibold text-white hover:bg-[var(--color-accent-secondary)]"
            >
              <Upload className="h-4 w-4" />
              Upload File
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {filteredFiles.map((file) => {
              const extension =
                file.fileName.split(".").pop()?.toUpperCase() ?? "FILE";
              const isSpreadsheet =
                file.fileName.endsWith(".csv") ||
                file.fileName.endsWith(".xlsx") ||
                file.fileName.endsWith(".xls");

              return (
                <Card
                  key={file.id}
                  className="group relative overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-card shadow-[0_20px_40px_-32px_rgba(25,28,30,0.16)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_28px_54px_-30px_rgba(25,28,30,0.24)]"
                >
                  <div className="flex items-start gap-4 p-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--color-accent-light)] text-[var(--color-accent)]">
                      {isSpreadsheet ? (
                        <Table className="h-5 w-5" />
                      ) : (
                        <FileText className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className="truncate text-sm font-semibold text-[var(--color-text-primary)]"
                        title={file.fileName}
                      >
                        {file.fileName}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-secondary)]">
                        <span className="tabular-nums">
                          {file.rowCount.toLocaleString()}
                        </span>
                        <span>rows</span>
                        {file.isPrimary ? (
                          <Badge className="rounded-full border-0 bg-[var(--color-accent-light)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-accent)] hover:bg-[var(--color-accent-light)]">
                            Primary
                          </Badge>
                        ) : null}
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteFileConfirm(file)}
                      aria-label={`Remove ${file.fileName}`}
                      className="h-8 w-8 shrink-0 rounded-full text-[var(--color-text-muted)] opacity-0 transition-opacity hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)] group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between border-t border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-3">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">
                      {extension}
                    </span>
                    {file.isPrimary ? (
                      <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">
                        Used for dashboard charts
                      </span>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <AlertDialog
        open={Boolean(deleteFileConfirm)}
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
              onClick={() => void handleRemoveFile()}
              className="bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-secondary)]"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
