import { type ReactNode, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { CircleUserRound, LogOut } from "lucide-react";
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
      aria-current={active ? "page" : undefined}
      className={`h-9 rounded-full px-4 text-sm font-semibold transition-all duration-200 ${
        active
          ? "bg-[var(--color-accent)] text-white shadow-[0_12px_24px_-14px_rgba(0,50,125,0.65)]"
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        const url = data.user?.user_metadata?.avatar_url;
        if (mounted && typeof url === "string") {
          setAvatarUrl(url);
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
                label="Overview"
                active={activeTab === "dashboard"}
                onClick={() => setActiveTab("dashboard")}
              />
              <NavItem
                label="Files"
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
            <button
              type="button"
              onClick={() => setActiveTab("settings")}
              aria-label="Open settings"
              className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-white text-[var(--color-text-secondary)] shadow-[0_8px_24px_rgba(25,28,30,0.06)] transition hover:opacity-80"
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

        <nav className="flex items-center gap-2 overflow-x-auto border-t border-[var(--color-border)] px-4 py-2 md:hidden">
          <NavItem
            label="Overview"
            active={activeTab === "dashboard"}
            onClick={() => setActiveTab("dashboard")}
          />
          <NavItem
            label="Files"
            active={activeTab === "dashboards"}
            onClick={() => setActiveTab("dashboards")}
          />
          <NavItem
            label="Settings"
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
          />
        </nav>
      </header>

      <main className="mx-auto h-[calc(100vh-113px)] max-w-[1280px] overflow-y-auto pt-[113px] md:h-[calc(100vh-64px)] md:pt-16">
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
