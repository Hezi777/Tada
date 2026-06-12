"use client";

import { type ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  CircleUserRound,
  FolderClosed,
  LayoutDashboard,
  LogOut,
  Menu,
  Monitor,
  Moon,
  Settings,
  Sun,
  X,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Dashboard } from "./Dashboard";
import FileManager from "./FileManager";
import { SettingsPanel } from "./SettingsPanel";
import { FloatingChat } from "./FloatingChat";
import { logout } from "@/features/auth/server/actions";
import { createClient } from "@/shared/lib/supabase/client";

interface AppShellProps {
  dashboardContent?: ReactNode;
  showFloatingChat?: boolean;
}

type ThemeMode = "system" | "light" | "dark";
type NavTab = "dashboard" | "dashboards" | "settings";

const THEME_STORAGE_KEY = "tada-theme";
const THEME_EVENT = "tada-theme-change";

function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
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
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)] ${
        active
          ? "bg-[rgba(0,50,125,0.08)] font-semibold text-[var(--color-text-primary)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
      }`}
    >
      <span
        className={
          active
            ? "text-[var(--color-accent)]"
            : "text-[var(--color-text-muted)]"
        }
      >
        {icon}
      </span>
      {label}
    </button>
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
  const [themeMode, setThemeMode] = useState<ThemeMode>(readThemeMode);
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

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

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncTheme = (nextMode: ThemeMode) => {
      applyThemeMode(nextMode, media.matches);
    };

    syncTheme(themeMode);
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);

    const handleThemeEvent = () => {
      const nextMode = readThemeMode();
      setThemeMode(nextMode);
      syncTheme(nextMode);
    };

    const handleMediaChange = (event: MediaQueryListEvent) => {
      if (readThemeMode() === "system") {
        applyThemeMode("system", event.matches);
      }
    };

    window.addEventListener(THEME_EVENT, handleThemeEvent);
    window.addEventListener("storage", handleThemeEvent);
    media.addEventListener("change", handleMediaChange);

    return () => {
      window.removeEventListener(THEME_EVENT, handleThemeEvent);
      window.removeEventListener("storage", handleThemeEvent);
      media.removeEventListener("change", handleMediaChange);
    };
  }, [themeMode]);

  const cycleTheme = () => {
    const order: ThemeMode[] = ["system", "light", "dark"];
    const next = order[(order.indexOf(themeMode) + 1) % order.length];
    window.localStorage.setItem(THEME_STORAGE_KEY, next);
    setThemeMode(next);
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  const handleNavigate = (tab: NavTab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center gap-2 px-5">
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
          <span className="text-lg font-bold text-[var(--color-text-primary)]">
            Tada
          </span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Workspace
        </div>
        <div className="flex flex-col gap-1">
          <NavItem
            label="Overview"
            icon={<LayoutDashboard className="h-4 w-4" />}
            active={activeTab === "dashboard"}
            onClick={() => handleNavigate("dashboard")}
          />
          <NavItem
            label="Files"
            icon={<FolderClosed className="h-4 w-4" />}
            active={activeTab === "dashboards"}
            onClick={() => handleNavigate("dashboards")}
          />
        </div>

        <div className="mb-1 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Account
        </div>
        <div className="flex flex-col gap-1">
          <NavItem
            label="Settings"
            icon={<Settings className="h-4 w-4" />}
            active={activeTab === "settings"}
            onClick={() => handleNavigate("settings")}
          />
        </div>
      </nav>

      <div className="shrink-0 border-t border-[var(--color-border)] p-3">
        <Link
          href="/pricing"
          className="block rounded-xl bg-[var(--color-surface-muted)] p-3 transition hover:opacity-90"
        >
          <span className="inline-flex items-center rounded-full bg-[var(--color-accent)] px-2 py-0.5 text-[11px] font-semibold text-white">
            Beta
          </span>
          <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
            All features free during beta
          </p>
        </Link>

        <div className="mt-3 flex items-center gap-2 px-1">
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

          <span className="min-w-0 flex-1 truncate text-xs text-[var(--color-text-secondary)]">
            {userEmail ?? ""}
          </span>

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
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-[var(--color-border)] bg-card lg:block">
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
              initial={prefersReducedMotion ? { opacity: 0 } : { x: "-100%" }}
              animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: "-100%" }}
              transition={{
                duration: prefersReducedMotion ? 0.12 : 0.22,
                ease: "easeOut",
              }}
              className="fixed inset-y-0 left-0 z-50 w-[248px] border-r border-[var(--color-border)] bg-card lg:hidden"
            >
              <div className="absolute right-3 top-3">
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
              {sidebarContent}
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>

      <div className="flex h-full flex-col lg:pl-[248px]">
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
              key={activeTab}
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={prefersReducedMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
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
