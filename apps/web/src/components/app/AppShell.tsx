import { type ReactNode, useEffect, useState } from "react";
import { Files, LayoutDashboard, LogOut, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Dashboard } from "./Dashboard";
import { FileManager } from "./FileManager";
import { SettingsPanel } from "./SettingsPanel";
import { FloatingChat } from "./FloatingChat";
import tadaLogo from "@/assets/tada-logo.png";
import { useDashboardStore } from "@/lib/dashboard-store";
import { logout } from "@/app/actions";

interface AppShellProps {
  dashboardContent?: ReactNode;
  showFloatingChat?: boolean;
}

type ThemeMode = "system" | "light" | "dark";
type NavTab = "dashboard" | "files" | "settings";

const THEME_STORAGE_KEY = "tada-theme";

function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
  disabled = false,
}: {
  icon: typeof LayoutDashboard;
  label: string;
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      disabled={disabled}
      className={`relative h-11 w-full justify-start gap-3 rounded-lg px-4 text-sm font-semibold transition-all duration-150 ${active
          ? "bg-[var(--color-accent-light)] text-[var(--color-accent)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
        }`}
    >
      {active ? <span className="absolute inset-y-2 left-0 w-[3px] rounded-r-full bg-[var(--color-accent)]" /> : null}
      <Icon className="h-[18px] w-[18px]" />
      <span>{label}</span>
    </Button>
  );
}

export function AppShell({ dashboardContent, showFloatingChat = true }: AppShellProps) {
  const datasetId = useDashboardStore((snapshot) => snapshot.datasetId);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "system";
    }
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });
  const [activeTab, setActiveTab] = useState<NavTab>("dashboard");

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    const root = window.document.documentElement;
    const applyMode = (mode: ThemeMode, prefersDark: boolean) => {
      const isDark = mode === "dark" || (mode === "system" && prefersDark);
      root.classList.toggle("dark", isDark);
    };
    if (themeMode === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      applyMode("system", media.matches);
      const listener = (event: MediaQueryListEvent) => applyMode("system", event.matches);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
    applyMode(themeMode, false);
  }, [themeMode]);

  return (
    <div className="h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-[240px] flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--color-accent-light)]">
            <img src={tadaLogo} alt="TADA" className="h-6 w-6" />
          </div>
          <div>
            <div className="text-xl font-extrabold tracking-tight text-[var(--color-accent)]">TADA</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--color-text-muted)]">
              Workspace
            </div>
          </div>
        </div>

        <nav className="mt-10 space-y-2">
          <SidebarItem
            icon={LayoutDashboard}
            label="Dashboard"
            active={activeTab === "dashboard"}
            onClick={() => setActiveTab("dashboard")}
          />
          <SidebarItem
            icon={Files}
            label="Files"
            active={activeTab === "files"}
            disabled={!datasetId}
            onClick={() => setActiveTab("files")}
          />
        </nav>

        <div className="flex-1" />

        <Separator className="mb-4 bg-[var(--color-border)]" />

        <div className="space-y-2">
          <SidebarItem
            icon={Settings}
            label="Settings"
            active={activeTab === "settings"}
            onClick={() => setActiveTab("settings")}
          />
          <form action={logout}>
            <Button
              type="submit"
              variant="ghost"
              className="h-11 w-full justify-start gap-3 rounded-lg px-4 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)] hover:text-[var(--color-accent)]"
            >
              <LogOut className="h-[18px] w-[18px]" />
              Logout
            </Button>
          </form>
        </div>
      </aside>

      <div className="ml-[240px] h-screen">
        {activeTab === "settings" ? (
          <SettingsPanel />
        ) : activeTab === "files" ? (
          <FileManager />
        ) : dashboardContent ? (
          dashboardContent
        ) : (
          <Dashboard />
        )}
      </div>

      {showFloatingChat ? <FloatingChat /> : null}
    </div>
  );
}
