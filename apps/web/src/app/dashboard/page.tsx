"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { ProcessingView } from "@/components/app/ProcessingView";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  clearActiveDashboard,
  getDashboardStoreState,
  initializeDashboardStore,
  resetDashboardStore,
  setActiveDashboard,
  useDashboardStore,
} from "@/lib/dashboard-store";
import {
  listDashboards,
  loadDashboard,
  createDashboard,
  persistDashboardCharts,
  uploadDataset,
} from "@/lib/api";

type DashboardPageState = "loading" | "empty" | "processing" | "loaded";

function DashboardUploadEmptyState({
  onFileUpload,
  errorMessage,
}: {
  onFileUpload: (file: File) => void;
  errorMessage: string | null;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg)] p-6">
      <div className="flex h-full flex-col overflow-hidden rounded-[24px] bg-white shadow-[0_22px_52px_-38px_rgba(25,28,30,0.14)]">
        <div className="flex items-center justify-between px-6 py-5">
          <div>
            <h1 className="font-display text-2xl text-[var(--color-text-primary)]">
              Dashboard
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              Upload a dataset to start building your workspace.
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center px-6 py-8">
          <Card className="w-full max-w-2xl rounded-[24px] border-0 bg-[var(--color-bg)] p-8 shadow-none">
            <div className="mx-auto flex max-w-xl flex-col items-center text-center">
              <div className="mb-6 flex justify-center">
                <Image
                  src="/tada-logo.svg"
                  alt="Tada"
                  width={48}
                  height={48}
                  className="h-12 w-auto"
                />
              </div>
              <h2 className="font-display text-3xl text-[var(--color-text-primary)]">
                Upload your first dataset
              </h2>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text-secondary)]">
                Add a CSV or Excel file and TADA will generate your dashboard,
                KPIs, and charts.
              </p>

              {errorMessage ? (
                <div className="mt-6 w-full rounded-[20px] bg-[var(--color-surface-muted)] px-4 py-3 text-sm font-medium text-[var(--color-text-secondary)]">
                  {errorMessage}
                </div>
              ) : null}

              <Button
                type="button"
                size="lg"
                className="mt-8 rounded-full bg-[var(--color-accent)] px-8 text-white hover:bg-[#0047ab]"
                onClick={() => inputRef.current?.click()}
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" />
                Choose file
              </Button>

              <Input
                ref={inputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
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
    </div>
  );
}

function DashboardLoadingState() {
  return (
    <div className="flex h-full flex-col bg-[var(--color-bg)] p-6">
      <div className="flex h-full items-center justify-center rounded-[24px] bg-white shadow-[0_22px_52px_-38px_rgba(25,28,30,0.14)]">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/tada-logo.svg"
            alt="Tada"
            width={48}
            height={48}
            className="h-12 w-auto"
          />
          <p className="mt-4 text-sm font-medium text-[var(--color-text-secondary)]">
            Loading dashboard...
          </p>
        </div>
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

        const snapshot = await uploadDataset(file, dashboardId);
        isHydratingRef.current = true;
        lastPersistedChartsRef.current = JSON.stringify(snapshot.charts);
        initializeDashboardStore(snapshot);
        setIsUploadReady(true);
      } catch (error) {
        resetDashboardStore();
        setUploadError(
          error instanceof Error && error.message
            ? error.message.replace(/_/g, " ")
            : "Upload failed. Check the API server and try again.",
        );
        setPageState("empty");
      } finally {
        isHydratingRef.current = false;
      }
    },
    [activeDashboardId],
  );

  const dashboardContent = useMemo(() => {
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
  }, [handleFileUpload, isUploadReady, loadError, pageState, uploadError]);

  return (
    <AppShell
      dashboardContent={pageState === "loaded" ? undefined : dashboardContent}
      showFloatingChat={
        pageState === "loaded" && Boolean(getDashboardStoreState().datasetId)
      }
    />
  );
}
