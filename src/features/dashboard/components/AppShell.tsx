"use client";

import {
  type ReactNode,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useLanguage, useTranslation } from "@/shared/i18n";
import {
  CircleUserRound,
  FolderClosed,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { Dashboard } from "./Dashboard";
import FileManager from "./FileManager";
import { SettingsPanel } from "./SettingsPanel";
import { FloatingChat } from "./FloatingChat";
import { logout } from "@/features/auth/server/actions";
import { createClient } from "@/shared/lib/supabase/client";
import { useDashboardStore } from "@/features/dashboard/client/store";

interface AppShellProps {
  dashboardContent?: ReactNode;
  showFloatingChat?: boolean;
}

type ThemeMode = "system" | "light" | "dark";
type NavTab = "dashboard" | "dashboards" | "settings";

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

function NavItem({
  label,
  icon,
  active,
  collapsed,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      className={`flex h-10 w-full items-center gap-3 rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${
        collapsed ? "justify-center px-0" : "px-3"
      } ${
        active
          ? "mesh-navy font-bold text-white shadow-premium"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
      }`}
    >
      <span className={active ? "text-white" : "text-[var(--color-text-muted)]"}>
        {icon}
      </span>
      {collapsed ? null : label}
    </button>
  );

  if (!collapsed) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
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
      className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
    >
      {icon}
    </button>
  );
}

export function AppShell({
  dashboardContent,
  showFloatingChat = true,
}: AppShellProps) {
  const { t } = useTranslation();
  const lang = useLanguage();
  const isRtl = lang === "he";
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

  const renderSidebarContent = (collapsed: boolean) => (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-16 shrink-0 items-center gap-2 ${
          collapsed ? "justify-center px-2" : "px-5"
        }`}
      >
        <Link
          href="/"
          aria-label="Tada home"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <Image
            src="/tada-logo.svg"
            alt="Tada"
            width={32}
            height={32}
            priority
            className="h-8 w-8 shrink-0"
          />
          {collapsed ? null : (
            <span className="text-xl font-black tracking-tight text-[var(--color-text-primary)]">
              Tada
            </span>
          )}
        </Link>

        {collapsed ? null : (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Collapse sidebar"
            title="Collapse sidebar"
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${
              isRtl ? "mr-auto" : "ml-auto"
            }`}
          >
            <PanelLeftClose className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>

      {collapsed ? (
        <div className="flex justify-center px-3 pb-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleCollapsed}
                aria-label="Expand sidebar"
                className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
              >
                <PanelLeftOpen className={`h-4 w-4 ${isRtl ? "rotate-180" : ""}`} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Expand sidebar</TooltipContent>
          </Tooltip>
        </div>
      ) : null}

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {collapsed ? null : (
          <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {t("nav.group.workspace")}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <NavItem
            label={t("nav.overview")}
            icon={<LayoutDashboard className="h-4 w-4" />}
            active={activeTab === "dashboard"}
            collapsed={collapsed}
            onClick={() => handleNavigate("dashboard")}
          />
          <NavItem
            label={t("nav.files")}
            icon={<FolderClosed className="h-4 w-4" />}
            active={activeTab === "dashboards"}
            collapsed={collapsed}
            onClick={() => handleNavigate("dashboards")}
          />
        </div>

        {collapsed ? (
          <div className="my-3 border-t border-[var(--color-border)]" />
        ) : (
          <div className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            {t("nav.group.account")}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <NavItem
            label={t("nav.settings")}
            icon={<Settings className="h-4 w-4" />}
            active={activeTab === "settings"}
            collapsed={collapsed}
            onClick={() => handleNavigate("settings")}
          />
        </div>
      </nav>

      <div className="shrink-0 border-t border-[var(--color-border)] p-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/pricing"
                aria-label={t("shell.beta")}
                className="mesh-teal shadow-premium flex items-center justify-center rounded-xl p-3 transition hover:opacity-90"
              >
                <span className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-bold text-white">
                  {t("shell.beta")}
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">{t("shell.betaNote")}</TooltipContent>
          </Tooltip>
        ) : (
          <Link
            href="/pricing"
            className="mesh-teal shadow-premium block rounded-xl p-3 transition hover:opacity-90"
          >
            <span className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-bold text-white">
              {t("shell.beta")}
            </span>
            <p className="mt-2 text-xs font-medium text-[var(--color-text-secondary)]">
              {t("shell.betaNote")}
            </p>
          </Link>
        )}

        <div
          className={`mt-3 flex items-center gap-2 ${
            collapsed ? "flex-col" : "px-1"
          }`}
        >
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleNavigate("settings")}
                  aria-label="Open settings"
                  className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card text-[var(--color-text-secondary)] shadow-[0_8px_24px_rgba(25,28,30,0.06)] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
                >
                  {avatarUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={avatarUrl}
                      alt="Your profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <CircleUserRound className="h-5 w-5" />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {userEmail ?? t("nav.settings")}
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => handleNavigate("settings")}
              aria-label="Open settings"
              className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card text-[var(--color-text-secondary)] shadow-[0_8px_24px_rgba(25,28,30,0.06)] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]"
            >
              {avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={avatarUrl}
                  alt="Your profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <CircleUserRound className="h-5 w-5" />
              )}
            </button>
          )}

          {collapsed ? null : (
            <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-text-secondary)]">
              {userEmail ?? ""}
            </span>
          )}

          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <form action={logout}>
                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-accent)]"
                    aria-label="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </form>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          ) : (
            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-accent)]"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );

  const sidebarContent = (
    <TooltipProvider delayDuration={150}>
      {renderSidebarContent(collapsed)}
    </TooltipProvider>
  );

  const mobileSidebarContent = (
    <TooltipProvider delayDuration={150}>
      {renderSidebarContent(false)}
    </TooltipProvider>
  );

  return (
    <div className="h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 z-30 hidden bg-card transition-[width] duration-200 ease-in-out motion-reduce:transition-none lg:block ${
          collapsed ? "w-16" : "w-[248px]"
        } ${
          isRtl
            ? "right-0 border-l border-[var(--color-border)]"
            : "left-0 border-r border-[var(--color-border)]"
        }`}
      >
        {sidebarContent}
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
              className={`fixed inset-y-0 z-50 w-[248px] bg-card lg:hidden ${
                isRtl
                  ? "right-0 border-l border-[var(--color-border)]"
                  : "left-0 border-r border-[var(--color-border)]"
              }`}
            >
              <div className={`absolute top-3 ${isRtl ? "left-3" : "right-3"}`}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                  className="h-9 w-9 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {mobileSidebarContent}
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
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between bg-[var(--color-bg)] px-4 sm:px-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="h-9 w-9 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] lg:hidden"
          >
            <Menu className="h-4 w-4" />
          </Button>

          <div className="ml-auto">
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
