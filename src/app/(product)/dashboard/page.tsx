"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { AppShell } from "@/features/dashboard/components/AppShell";
import { ProcessingView } from "@/features/dashboard/components/ProcessingView";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
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
  errorMessage: string | null;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex h-full flex-col">
      <DashboardStateHeader
        title="Overview"
        subtitle="Upload a dataset to start building your workspace."
      />

      <div className="flex flex-1 items-center justify-center px-5 pb-6">
        <Card className="w-full max-w-2xl rounded-[24px] border-0 bg-white p-8 shadow-[0_22px_52px_-38px_rgba(25,28,30,0.14)] sm:p-10">
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
              Upload your first dataset
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
              Add a CSV, Excel, or PDF file and TADA will profile your data and
              generate your dashboard, KPIs, and charts.
            </p>

            {errorMessage ? (
              <div className="mt-6 w-full rounded-[16px] border border-[rgba(220,38,38,0.2)] bg-[rgba(220,38,38,0.06)] px-4 py-3 text-sm font-medium text-[#dc2626]">
                {errorMessage}
              </div>
            ) : null}

            <Button
              type="button"
              size="lg"
              className="mt-8 rounded-full bg-[var(--color-accent)] px-8 text-white hover:bg-[var(--color-accent-secondary)]"
              onClick={() => inputRef.current?.click()}
            >
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Choose file
            </Button>

            <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-text-muted)]">
              CSV, Excel, or PDF · up to 10MB
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
  return (
    <div className="flex h-full flex-col items-center justify-center bg-[var(--color-bg)]">
      <div className="flex flex-col items-center text-center">
        <Image
          src="/tada-logo.svg"
          alt="Tada"
          width={48}
          height={48}
          className="h-10 w-auto animate-pulse-soft"
        />
        <p className="mt-4 text-sm font-medium text-[var(--color-text-secondary)]">
          Loading your dashboard...
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const datasetId = useDashboardStore((snapshot) => snapshot.datasetId);
  const charts = useDashboardStore((snapshot) => snapshot.charts);
  const activeDashboardId = useDashboardStore((s) => s.activeDashboardId);
  const [pageState, setPageState] = useState<DashboardPageState>("loading");
  const [isUploadReady, setIsUploadReady] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
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
          lastPersistedChartsRef.current = JSON.stringify(result.charts);
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
        setLoadError(
          error instanceof Error && error.message
            ? error.message.replace(/_/g, " ")
            : "Unable to load your dashboard.",
        );
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
    const nextSerialized = JSON.stringify(charts);
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
    void persistDashboardCharts({ datasetId, charts }).catch((error) => {
      console.error("[dashboard] failed to persist charts:", error);
    });
  }, [charts, datasetId]);

  const [profiledUpload, setProfiledUpload] =
    useState<UploadProfileResponse | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleFileUpload = useCallback(
    async (file: File) => {
      setIsUploadReady(false);
      setUploadError(null);
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
        setUploadError(
          error instanceof Error && error.message
            ? error.message.replace(/_/g, " ")
            : "Upload failed. Check the API server and try again.",
        );
        setPageState("empty");
      }
    },
    [activeDashboardId],
  );

  const handleConfirmGeneration = useCallback(
    async (topic: DatasetTopic, chartCount: number) => {
      if (!profiledUpload) {
        return;
      }
      setIsGenerating(true);
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
        setUploadError(
          error instanceof Error && error.message
            ? error.message.replace(/_/g, " ")
            : "Dashboard generation failed. Try again.",
        );
        setPageState("empty");
      } finally {
        isHydratingRef.current = false;
        setIsGenerating(false);
      }
    },
    [profiledUpload],
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
