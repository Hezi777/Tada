"use client";

import {
  type ReactNode,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLanguage, useTranslation } from "@/shared/i18n";
import { ChevronRight, Home, Menu, Monitor, Moon, Sun, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Dashboard } from "./Dashboard";
import FileManager from "./FileManager";
import { SettingsPanel } from "./SettingsPanel";
import { FloatingChat } from "./FloatingChat";
import { Sidebar, type NavTab } from "./Sidebar";
import { createClient } from "@/shared/lib/supabase/client";
import { useDashboardStore } from "@/features/dashboard/client/store";

interface AppShellProps {
  dashboardContent?: ReactNode;
  showFloatingChat?: boolean;
}

type ThemeMode = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "tada-theme";
const THEME_EVENT = "tada-theme-change";
const SIDEBAR_COLLAPSED_KEY = "tada-sidebar-collapsed";
const SIDEBAR_EVENT = "tada-sidebar-change";

// useSyncExternalStore subscribers: keep localStorage-backed prefs SSR-safe
// (separate server snapshot) so they never cause a hydration mismatch.
function subscribeTheme(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function subscribeSidebar(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(SIDEBAR_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(SIDEBAR_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function readSidebarCollapsed(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
}

function applyThemeMode(mode: ThemeMode, prefersDark: boolean) {
  const root = window.document.documentElement;
  const isDark = mode === "dark" || (mode === "system" && prefersDark);
  root.classList.toggle("dark", isDark);
}

function ThemeToggle({
  themeMode,
  onCycle,
}: {
  themeMode: ThemeMode;
  onCycle: () => void;
}) {
  const icon =
    themeMode === "light" ? (
      <Sun className="h-4 w-4" />
    ) : themeMode === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Monitor className="h-4 w-4" />
    );

  const label =
    themeMode === "light"
      ? "Theme: Light"
      : themeMode === "dark"
        ? "Theme: Dark"
        : "Theme: System";

  return (
    <button
      type="button"
      onClick={onCycle}
      aria-label={`${label}. Click to change.`}
      title={label}
      className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-muted-foreground transition-colors duration-150 motion-reduce:transition-none hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {icon}
    </button>
  );
}

export function AppShell({
  dashboardContent,
  showFloatingChat = true,
}: AppShellProps) {
  const lang = useLanguage();
  const isRtl = lang === "he";
  const { t } = useTranslation();
  // localStorage-backed prefs read via useSyncExternalStore: the server snapshot
  // ("system" / not-collapsed) matches the first client render, so there is no
  // hydration mismatch, and updates flow through the THEME_EVENT/SIDEBAR_EVENT.
  const themeMode = useSyncExternalStore(
    subscribeTheme,
    readThemeMode,
    () => "system" as ThemeMode,
  );
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    readSidebarCollapsed,
    () => false,
  );
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const activeDashboardId = useDashboardStore((s) => s.activeDashboardId);

  const toggleCollapsed = () => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(!collapsed));
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  };

  useEffect(() => {
    let mounted = true;
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        const url = data.user?.user_metadata?.avatar_url;
        if (mounted && typeof url === "string") {
          setAvatarUrl(url);
        }
        if (mounted && typeof data.user?.email === "string") {
          setUserEmail(data.user.email);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Apply the resolved theme (dark class) whenever the mode changes, and keep
  // "system" in sync with the OS preference.
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    applyThemeMode(themeMode, media.matches);

    const handleMediaChange = (event: MediaQueryListEvent) => {
      if (themeMode === "system") {
        applyThemeMode("system", event.matches);
      }
    };
    media.addEventListener("change", handleMediaChange);
    return () => media.removeEventListener("change", handleMediaChange);
  }, [themeMode]);

  const cycleTheme = () => {
    const order: ThemeMode[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(themeMode) + 1) % order.length];
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const handleNavigate = (tab: NavTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const activeSectionLabel =
    activeTab === "settings"
      ? t("nav.settings")
      : activeTab === "dashboards"
        ? t("nav.files")
        : t("nav.overview");

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 z-30 hidden bg-sidebar transition-[width] duration-200 ease-in-out motion-reduce:transition-none lg:block ${
          collapsed ? "w-16" : "w-[248px]"
        } ${
          isRtl
            ? "right-0 border-l border-sidebar-border"
            : "left-0 border-r border-sidebar-border"
        }`}
      >
        <Sidebar
          activeTab={activeTab}
          onNavigate={handleNavigate}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          isRtl={isRtl}
          avatarUrl={avatarUrl}
          userEmail={userEmail}
        />
      </aside>

      {/* Mobile/tablet sidebar drawer */}
      <AnimatePresence>
        {sidebarOpen ? (
          <>
            <motion.div
              key="sidebar-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
              className="fixed inset-0 z-40 bg-black/30 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
            <motion.aside
              key="sidebar-drawer"
              initial={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { x: isRtl ? "100%" : "-100%" }
              }
              animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 0 }
                  : { x: isRtl ? "100%" : "-100%" }
              }
              transition={{
                duration: prefersReducedMotion ? 0.12 : 0.22,
                ease: "easeOut",
              }}
              className={`fixed inset-y-0 z-50 w-[248px] bg-sidebar lg:hidden ${
                isRtl
                  ? "right-0 border-l border-sidebar-border"
                  : "left-0 border-r border-sidebar-border"
              }`}
            >
              <div className={`absolute top-3 ${isRtl ? "left-3" : "right-3"}`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <Sidebar
                activeTab={activeTab}
                onNavigate={handleNavigate}
                collapsed={false}
                onToggleCollapsed={toggleCollapsed}
                isRtl={isRtl}
                avatarUrl={avatarUrl}
                userEmail={userEmail}
              />
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div
        className={`flex h-full flex-col transition-[padding] duration-200 ease-in-out motion-reduce:transition-none ${
          collapsed
            ? isRtl
              ? "lg:pr-16"
              : "lg:pl-16"
            : isRtl
              ? "lg:pr-[248px]"
              : "lg:pl-[248px]"
        }`}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
              className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>

            {/* Breadcrumb */}
            <div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex">
              <Home className="h-4 w-4" aria-hidden="true" />
              <ChevronRight
                className={`h-4 w-4 text-muted-foreground/60 ${isRtl ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
              <span className="rounded-xl bg-muted px-2.5 py-1 text-sm font-medium text-foreground">
                {activeSectionLabel}
              </span>
            </div>
          </div>

          <div className="ms-auto">
            <ThemeToggle themeMode={themeMode} onCycle={cycleTheme} />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto px-4 pb-6 sm:px-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${activeTab}:${activeDashboardId ?? "none"}`}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="h-full"
            >
              {activeTab === "settings" ? (
                <SettingsPanel />
              ) : activeTab === "dashboards" ? (
                <FileManager />
              ) : dashboardContent ? (
                dashboardContent
              ) : (
                <Dashboard />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {showFloatingChat ? <FloatingChat /> : null}
    </div>
  );
}
