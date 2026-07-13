"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { AppShell } from "@/features/dashboard/components/AppShell";
import { ProcessingView } from "@/features/dashboard/components/ProcessingView";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  clearActiveDashboard,
  getDashboardStoreState,
  initializeDashboardStore,
  resetDashboardStore,
  setActiveDashboard,
  useDashboardStore,
} from "@/features/dashboard/client/store";
import {
  listDashboards,
  loadDashboard,
  createDashboard,
  generateDashboard,
  persistDashboardCharts,
  uploadDataset,
} from "@/shared/lib/api";
import { ConfirmGenerationStep } from "@/features/dashboard/components/ConfirmGenerationStep";
import type { DatasetTopic, UploadProfileResponse } from "@/shared/contracts";
import { useToast } from "@/shared/hooks/use-toast";
import { useTranslation } from "@/shared/i18n";

type DashboardPageState =
  | "loading"
  | "empty"
  | "confirm"
  | "processing"
  | "loaded";

function DashboardStateHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-1 px-5 pb-4 pt-6">
      <div className="font-display text-[32px] font-extrabold tracking-[-0.04em] text-[var(--color-text-primary)]">
        {title}
      </div>
      <p className="max-w-[52rem] text-sm text-[var(--color-text-secondary)]">
        {subtitle}
      </p>
    </div>
  );
}

function DashboardUploadEmptyState({
  onFileUpload,
  errorMessage,
}: {
  onFileUpload: (file: File) => void;
  errorMessage?: string | null;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex h-full flex-col">
      <DashboardStateHeader
        title={t("dash.overview")}
        subtitle={t("dash.empty.subtitle")}
      />

      <div className="flex flex-1 items-center justify-center px-5 pb-6">
        <Card className="w-full max-w-2xl rounded-[24px] border-0 bg-card p-8 shadow-[0_22px_52px_-38px_rgba(25,28,30,0.14)] sm:p-10">
          {errorMessage ? (
            <div
              role="alert"
              className="mx-auto mb-6 w-full max-w-xl rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm font-medium capitalize text-destructive"
            >
              {errorMessage}
            </div>
          ) : null}
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-[20px] bg-[rgba(0,50,125,0.08)]">
              <Image
                src="/tada-logo.svg"
                alt="Tada"
                width={40}
                height={40}
                className="h-9 w-auto"
              />
            </div>
            <h2 className="font-display text-3xl text-[var(--color-text-primary)]">
              {t("dash.empty.title")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
              {t("dash.empty.body")}
            </p>

            <Button
              type="button"
              size="lg"
              className="mt-8 rounded-full bg-[var(--color-accent)] px-8 text-white hover:bg-[var(--color-accent-secondary)]"
              onClick={() => inputRef.current?.click()}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {t("dash.empty.choose")}
            </Button>

            <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              {t("dash.empty.hint")}
            </p>

            <Input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls,.pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) {
                  onFileUpload(file);
                }
              }}
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function DashboardLoadingState() {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.25, ease: "easeOut" }}
      className="flex h-full flex-col"
      aria-busy="true"
      aria-label={t("dash.loading")}
    >
      {/* Header skeleton */}
      <div className="flex shrink-0 flex-col gap-2 px-5 pb-4 pt-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* KPI row skeleton */}
      <div className="grid grid-cols-1 gap-5 px-5 py-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-[20px]" />
        ))}
      </div>

      {/* Chart grid skeleton */}
      <div className="grid flex-1 grid-cols-1 gap-5 px-5 pb-6 md:grid-cols-2 xl:grid-cols-12 xl:gap-6">
        <Skeleton className="min-h-[280px] rounded-[24px] xl:col-span-7" />
        <Skeleton className="min-h-[280px] rounded-[24px] xl:col-span-5" />
        <Skeleton className="min-h-[280px] rounded-[24px] xl:col-span-6" />
        <Skeleton className="min-h-[280px] rounded-[24px] xl:col-span-6" />
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { toast } = useToast();
  const datasetId = useDashboardStore((snapshot) => snapshot.datasetId);
  const charts = useDashboardStore((snapshot) => snapshot.charts);
  const kpis = useDashboardStore((snapshot) => snapshot.kpis);
  const activeDashboardId = useDashboardStore((s) => s.activeDashboardId);
  const [pageState, setPageState] = useState<DashboardPageState>("loading");
  const [processingPhase, setProcessingPhase] = useState<
    "profiling" | "generating"
  >("profiling");
  const [isUploadReady, setIsUploadReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const lastPersistedChartsRef = useRef<string | null>(null);
  const isHydratingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialDashboard() {
      setLoadError(null);
      try {
        // Try loading dashboards first
        const dashboards = await listDashboards();
        if (cancelled) return;

        if (dashboards.length > 0) {
          // Load the most recently updated dashboard
          const mostRecent = dashboards[0];
          const result = await loadDashboard(mostRecent.id);
          if (cancelled) return;

          if ("empty" in result) {
            // Dashboard exists but has no files
            setActiveDashboard(result.dashboard);
            resetDashboardStore();
            lastPersistedChartsRef.current = null;
            setPageState("empty");
            return;
          }

          isHydratingRef.current = true;
          lastPersistedChartsRef.current = JSON.stringify({
            charts: result.charts,
            kpis: result.kpis,
          });
          initializeDashboardStore(result, result.dashboard);
          setActiveDashboard(result.dashboard);
          setPageState("loaded");
          return;
        }

        clearActiveDashboard();
        resetDashboardStore();
        lastPersistedChartsRef.current = null;
        setPageState("empty");
      } catch (error) {
        if (cancelled) return;
        const message =
          error instanceof Error && error.message
            ? error.message.replace(/_/g, " ")
            : "Unable to load your dashboard.";
        setLoadError(message);
        toast({
          variant: "destructive",
          title: "Couldn't load dashboard",
          description: message,
        });
        clearActiveDashboard();
        resetDashboardStore();
        setPageState("empty");
      } finally {
        isHydratingRef.current = false;
      }
    }

    void loadInitialDashboard();

    return () => {
      cancelled = true;
    };
  }, [toast]);

  useEffect(() => {
    if (!datasetId) {
      return;
    }
    const nextSerialized = JSON.stringify({ charts, kpis });
    if (isHydratingRef.current) {
      lastPersistedChartsRef.current = nextSerialized;
      return;
    }
    if (lastPersistedChartsRef.current === null) {
      lastPersistedChartsRef.current = nextSerialized;
      return;
    }
    if (lastPersistedChartsRef.current === nextSerialized) {
      return;
    }
    lastPersistedChartsRef.current = nextSerialized;
    void persistDashboardCharts({ datasetId, charts, kpis }).catch((error) => {
      console.error("[dashboard] failed to persist charts:", error);
    });
  }, [charts, kpis, datasetId]);

  const [profiledUpload, setProfiledUpload] =
    useState<UploadProfileResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsUploadReady(false);
      setUploadError(null);
      setProcessingPhase("profiling");
      setPageState("processing");

      try {
        // If no active dashboard, auto-create one
        let dashboardId = activeDashboardId;
        if (!dashboardId) {
          const created = await createDashboard({
            name: file.name.replace(/\.[^.]+$/, ""),
            icon: "bar-chart",
            color: "#00327D",
          });
          dashboardId = created.id;
          setActiveDashboard({
            id: created.id,
            name: created.name,
            icon: created.icon,
            color: created.color,
          });
        }

        const profiled = await uploadDataset(file, dashboardId);
        setProfiledUpload(profiled);
        setPageState("confirm");
      } catch (error) {
        resetDashboardStore();
        const message =
          error instanceof Error && error.message
            ? error.message.replace(/_/g, " ")
            : "Upload failed. Check the API server and try again.";
        setUploadError(message);
        toast({
          variant: "destructive",
          title: "Upload failed",
          description: message,
        });
        setPageState("empty");
      }
    },
    [activeDashboardId, toast],
  );

  const handleConfirmGeneration = useCallback(
    async (topic: DatasetTopic, chartCount: number) => {
      if (!profiledUpload) {
        return;
      }
      setIsGenerating(true);
      setProcessingPhase("generating");
      setPageState("processing");

      try {
        const snapshot = await generateDashboard({
          datasetId: profiledUpload.datasetId,
          topic,
          chartCount,
        });
        isHydratingRef.current = true;
        lastPersistedChartsRef.current = JSON.stringify(snapshot.charts);
        initializeDashboardStore(snapshot);
        setProfiledUpload(null);
        setIsUploadReady(true);
      } catch (error) {
        resetDashboardStore();
        const message =
          error instanceof Error && error.message
            ? error.message.replace(/_/g, " ")
            : "Dashboard generation failed. Try again.";
        setUploadError(message);
        toast({
          variant: "destructive",
          title: "Generation failed",
          description: message,
        });
        setPageState("empty");
      } finally {
        isHydratingRef.current = false;
        setIsGenerating(false);
      }
    },
    [profiledUpload, toast],
  );

  const dashboardContent = useMemo(() => {
    if (pageState === "confirm" && profiledUpload) {
      return (
        <ConfirmGenerationStep
          profiled={profiledUpload}
          isGenerating={isGenerating}
          onConfirm={(topic, chartCount) => {
            void handleConfirmGeneration(topic, chartCount);
          }}
          onCancel={() => {
            setProfiledUpload(null);
            setPageState("empty");
          }}
        />
      );
    }
    if (pageState === "processing") {
      return (
        <ProcessingView
          phase={processingPhase}
          onComplete={() => setPageState("loaded")}
          isReady={isUploadReady}
        />
      );
    }
    if (pageState === "empty") {
      return (
        <DashboardUploadEmptyState
          onFileUpload={(file) => {
            void handleFileUpload(file);
          }}
          errorMessage={uploadError ?? loadError}
        />
      );
    }
    return <DashboardLoadingState />;
  }, [
    handleConfirmGeneration,
    handleFileUpload,
    isGenerating,
    isUploadReady,
    loadError,
    pageState,
    processingPhase,
    profiledUpload,
    uploadError,
  ]);

  return (
    <AppShell
      dashboardContent={pageState === "loaded" ? undefined : dashboardContent}
      showFloatingChat={
        pageState === "loaded" && Boolean(getDashboardStoreState().datasetId)
      }
    />
  );
}
