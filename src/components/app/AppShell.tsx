import { LogOut, Settings, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dashboard } from "./Dashboard";
import { FloatingChat } from "./FloatingChat";
import tadaLogo from "@/assets/tada-logo.png";

interface AppShellProps {
  onLogout: () => void;
}

export function AppShell({ onLogout }: AppShellProps) {
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* App Header */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <img src={tadaLogo} alt="Tada" className="h-7 w-7" />
          <span className="font-semibold text-foreground">Tada</span>
          <div className="hidden sm:flex items-center gap-2 ml-4 px-3 py-1.5 rounded-lg bg-secondary">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            <span className="text-sm text-foreground">sales_data_2024.csv</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-9 w-9">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onLogout} className="h-9 w-9">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Dashboard />
      </div>

      {/* Floating Chat */}
      <FloatingChat />
    </div>
  );
}
