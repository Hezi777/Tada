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
    <div className="h-screen flex flex-col bg-background">
      {/* App Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <img src={tadaLogo} alt="Tada" className="h-7 w-7" />
          <span className="font-semibold text-foreground">Tada</span>
          <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-lg bg-secondary">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">{dataset?.fileName ?? "No file loaded"}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Theme settings">
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel>Theme</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuRadioGroup value={themeMode} onValueChange={(value) => setThemeMode(value as ThemeMode)}>
                <DropdownMenuRadioItem value="system">System</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="light">Light</DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">Dark</DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="icon" onClick={onLogout} className="h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Dashboard dataset={dataset} dashboardState={dashboardState} />
      </div>

      {/* Floating Chat */}
      <FloatingChat
        datasetId={dashboardState?.datasetId ?? null}
        dashboardVersion={dashboardState?.version ?? 0}
        dashboardState={dashboardState}
        onDashboardUpdate={onDashboardUpdate}
      />
    </div>
  );
}
