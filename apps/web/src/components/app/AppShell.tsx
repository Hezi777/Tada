import { type ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, CircleUserRound, LogOut, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dashboard } from "./Dashboard";
import FileManager from "./FileManager";
import { SettingsPanel } from "./SettingsPanel";
import { FloatingChat } from "./FloatingChat";
import { logout } from "@/server/actions";

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
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded-full px-4 text-sm font-semibold transition-all duration-200 ${
        active
          ? "bg-[#191c1e] text-white"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
      }`}
    >
      {label}
    </button>
  );
}

export function AppShell({
  dashboardContent,
  showFloatingChat = true,
}: AppShellProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(readThemeMode);
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");

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

  return (
    <div className="h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <header className="fixed inset-x-0 top-0 z-40 bg-white">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              aria-label="Tada home"
              className="flex items-center transition-opacity hover:opacity-80"
            >
              <Image
                src="/tada-logo.svg"
                alt="Tada"
                width={48}
                height={48}
                priority
                className="h-8 w-auto shrink-0"
              />
            </Link>

            <nav className="hidden items-center gap-2 md:flex">
              <NavItem
                label="Dashboard"
                active={activeTab === "dashboard"}
                onClick={() => setActiveTab("dashboard")}
              />
              <NavItem
                label="Dashboards"
                active={activeTab === "dashboards"}
                onClick={() => setActiveTab("dashboards")}
              />
              <NavItem
                label="Settings"
                active={activeTab === "settings"}
                onClick={() => setActiveTab("settings")}
              />
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative hidden lg:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="search"
                aria-label="Search workspace"
                placeholder="Search workspace..."
                className="h-10 w-56 rounded-full border border-transparent bg-[var(--color-surface-muted)] pl-10 pr-4 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[rgba(0,50,125,0.14)] focus:bg-white"
              />
            </div>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-accent)]"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </Button>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[var(--color-text-secondary)] shadow-[0_8px_24px_rgba(25,28,30,0.06)]">
              <CircleUserRound className="h-5 w-5" />
            </div>

            <form action={logout}>
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-accent)]"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto h-[calc(100vh-64px)] max-w-[1280px] overflow-y-auto pt-16">
        {activeTab === "settings" ? (
          <SettingsPanel />
        ) : activeTab === "dashboards" ? (
          <FileManager />
        ) : dashboardContent ? (
          dashboardContent
        ) : (
          <Dashboard />
        )}
      </main>

      {showFloatingChat ? <FloatingChat /> : null}
    </div>
  );
}
