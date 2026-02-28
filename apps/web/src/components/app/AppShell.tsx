import { useEffect, useState } from "react";
import { LogOut, Settings, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dashboard } from "./Dashboard";
import { FloatingChat } from "./FloatingChat";
import tadaLogo from "@/assets/tada-logo.png";
import type { DatasetState } from "@/lib/dataset";
import type { DashboardState } from "@/lib/api";

interface AppShellProps {
  onLogout: () => void;
  dataset: DatasetState | null;
  dashboardState: DashboardState | null;
  onDashboardUpdate: (next: DashboardState) => void;
}

type ThemeMode = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "tada-theme";

export function AppShell({ onLogout, dataset, dashboardState, onDashboardUpdate }: AppShellProps) {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") {
      return "system";
    }
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    return stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
  });

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
    <div className="flex h-screen flex-col bg-background">
      <header className="shrink-0 px-4 pt-4 sm:px-6">
        <div className="container">
          <div className="glass flex min-h-16 items-center justify-between rounded-[1.75rem] border border-white/80 px-4 py-3 shadow-soft">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white shadow-card">
                <img src={tadaLogo} alt="Tada" className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <span className="font-display text-xl font-semibold text-foreground">Tada</span>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Workspace</p>
              </div>
              <div className="ml-2 hidden min-w-0 items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 shadow-card sm:flex">
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate text-sm font-medium text-foreground">
                  {dataset?.fileName ?? "No file loaded"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="glass" size="icon" className="h-10 w-10" aria-label="Theme settings">
                    <Settings className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup value={themeMode} onValueChange={(value) => setThemeMode(value as ThemeMode)}>
                    <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" onClick={onLogout} className="h-10 w-10">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden px-4 pb-4 pt-4 sm:px-6">
        <Dashboard dataset={dataset} dashboardState={dashboardState} />
      </div>

      <FloatingChat
        datasetId={dashboardState?.datasetId ?? null}
        dashboardVersion={dashboardState?.version ?? 0}
        dashboardState={dashboardState}
        onDashboardUpdate={onDashboardUpdate}
      />
    </div>
  );
}
