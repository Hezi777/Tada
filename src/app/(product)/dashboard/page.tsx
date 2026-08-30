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
import type { UploadProfileResponse } from "@/shared/contracts";
import { useToast } from "@/shared/hooks/use-toast";
import { useTranslation } from "@/shared/i18n";

type DashboardPageState = "loading" | "empty" | "processing" | "loaded";

function DashboardStateHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex shrink-0 flex-col gap-1 px-5 pb-4 pt-6">
      <div className="text-3xl font-semibold tracking-tight text-foreground">
        {title}
      </div>
      <p className="max-w-[52rem] text-sm text-muted-foreground">
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
        <Card className="w-full max-w-2xl p-8 sm:p-10">
          {errorMessage ? (
            <div
              role="alert"
              className="mx-auto mb-6 w-full max-w-xl rounded-2xl bg-destructive/10 px-4 py-3 text-center text-sm font-medium capitalize text-destructive"
            >
              {errorMessage}
            </div>
          ) : null}
          <div className="mx-auto flex max-w-xl flex-col items-center text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-xl bg-muted">
              <Image
                src="/tada-logo.svg"
                alt="Tada"
                width={40}
                height={40}
                className="h-9 w-auto"
              />
            </div>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">
              {t("dash.empty.title")}
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {t("dash.empty.body")}
            </p>

            <Button
              type="button"
              size="lg"
              className="mt-8 px-8"
              onClick={() => inputRef.current?.click()}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              {t("dash.empty.choose")}
            </Button>

            <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
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
      transition={{
        duration: prefersReducedMotion ? 0 : 0.25,
        ease: "easeOut",
      }}
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const lastPersistedChartsRef = useRef<string | null>(null);
  const isHydratingRef = useRef(false);
  const toastRef = useRef(toast);

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

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
        toastRef.current({
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
  }, []);

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

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploadError(null);
      setProfiledUpload(null);
      setProcessingPhase("profiling");
      setPageState("processing");

      try {
        const profiled = await uploadDataset(
          file,
          activeDashboardId ?? undefined,
        );
        setProfiledUpload(profiled);
        setProcessingPhase("generating");
        const snapshot = await generateDashboard({
          datasetId: profiled.datasetId,
          topic: profiled.suggestedTopic,
          chartCount: 4,
        });

        if (!activeDashboardId) {
          const created = await createDashboard({
            name: file.name.replace(/\.[^.]+$/, ""),
            icon: "bar-chart",
            color: "#00327D",
            datasetIds: [profiled.datasetId],
          });
          setActiveDashboard({
            id: created.id,
            name: created.name,
            icon: created.icon,
            color: created.color,
          });
        }

        isHydratingRef.current = true;
        lastPersistedChartsRef.current = JSON.stringify({
          charts: snapshot.charts,
          kpis: snapshot.kpis,
        });
        initializeDashboardStore(snapshot);
        setProfiledUpload(null);
        setPageState("loaded");
      } catch (error) {
        const message =
          error instanceof Error && error.message
            ? error.message.replace(/_/g, " ")
            : "Dashboard creation failed. Try again.";
        setUploadError(message);
        toast({
          variant: "destructive",
          title: "Couldn't create dashboard",
          description: message,
        });
        setProfiledUpload(null);
        if (activeDashboardId && getDashboardStoreState().datasetId) {
          setPageState("loaded");
        } else {
          resetDashboardStore();
          setPageState("empty");
        }
      } finally {
        isHydratingRef.current = false;
      }
    },
    [activeDashboardId, toast],
  );

  const dashboardContent = useMemo(() => {
    if (pageState === "processing") {
      return (
        <ProcessingView
          phase={processingPhase}
          piiColumns={profiledUpload?.profile.piiColumns ?? []}
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
    handleFileUpload,
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
