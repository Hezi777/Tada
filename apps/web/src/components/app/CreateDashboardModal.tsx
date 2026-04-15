"use client";

import {
  createElement,
  useState,
  type ComponentType,
  type FormEvent,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DASHBOARD_ICON_OPTIONS, DASHBOARD_COLOR_OPTIONS } from "@tada/shared";
import {
  BarChart3,
  PieChart,
  TrendingUp,
  Store,
  ShoppingCart,
  Users,
  Activity,
  Target,
  Zap,
  Layers,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (dashboard: { name: string; icon: string; color: string }) => void;
};

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  "bar-chart": BarChart3,
  "pie-chart": PieChart,
  "trending-up": TrendingUp,
  store: Store,
  "shopping-cart": ShoppingCart,
  users: Users,
  activity: Activity,
  target: Target,
  zap: Zap,
  layers: Layers,
};

export function getIconComponent(
  iconName: string,
): ComponentType<{ className?: string }> {
  return ICON_MAP[iconName] ?? BarChart3;
}

export default function CreateDashboardModal({
  open,
  onClose,
  onCreated,
}: Props) {
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<string>(
    DASHBOARD_ICON_OPTIONS[0],
  );
  const [selectedColor, setSelectedColor] = useState<string>(
    DASHBOARD_COLOR_OPTIONS[0],
  );
  const previewIcon = createElement(getIconComponent(selectedIcon), {
    className: "h-5 w-5",
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreated({
      name: name.trim(),
      icon: selectedIcon,
      color: selectedColor,
    });
    setName("");
    setSelectedIcon(DASHBOARD_ICON_OPTIONS[0]);
    setSelectedColor(DASHBOARD_COLOR_OPTIONS[0]);
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className="overflow-hidden rounded-[24px] border border-transparent bg-white p-0 text-[var(--color-text-primary)] shadow-[0_32px_64px_-44px_rgba(25,28,30,0.24)] sm:max-w-lg"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        <div className="bg-[linear-gradient(180deg,rgba(0,50,125,0.08)_0%,rgba(255,255,255,0)_100%)] px-6 pb-6 pt-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-display text-xl tracking-tight text-[var(--color-text-primary)]">
              New Dashboard
            </DialogTitle>
            <DialogDescription className="max-w-sm text-sm text-[var(--color-text-muted)]">
              Give it a name, choose an icon, and pick a gallery tint to make
              it easy to spot.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 pb-6">
          <div className="space-y-2">
            <label
              htmlFor="dashboard-name"
              className="block text-[12px] font-medium text-[var(--color-text-secondary)]"
            >
              Name
            </label>
            <Input
              id="dashboard-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q4 Sales Analysis"
              className="h-11 rounded-[8px] border border-[rgba(25,28,30,0.12)] bg-[var(--color-bg)] text-sm shadow-none transition-shadow focus-visible:ring-[var(--color-accent)]"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <p className="block text-[12px] font-medium text-[var(--color-text-secondary)]">
              Icon
            </p>
            <div
              className="grid grid-cols-5 gap-2 sm:grid-cols-6"
              role="radiogroup"
              aria-label="Dashboard icon"
            >
              {DASHBOARD_ICON_OPTIONS.map((iconName) => {
                const IconComp = getIconComponent(iconName);
                const isSelected = iconName === selectedIcon;
                return (
                  <button
                    key={iconName}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`Select ${iconName.replace(/-/g, " ")} icon`}
                    onClick={() => setSelectedIcon(iconName)}
                    className={`flex h-11 w-11 items-center justify-center rounded-[8px] border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 ${
                      isSelected
                        ? "border-[#00327d] shadow-none"
                        : "border-[rgba(25,28,30,0.12)] hover:-translate-y-0.5 hover:bg-[var(--color-surface-muted)]"
                    }`}
                    style={{
                      backgroundColor: isSelected
                        ? `${selectedColor}14`
                        : "white",
                      color: isSelected
                        ? selectedColor
                        : "var(--color-text-muted)",
                    }}
                  >
                    <IconComp className="h-5 w-5" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <p className="block text-[12px] font-medium text-[var(--color-text-secondary)]">
              Gallery Tint
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Dashboard gallery tint"
            >
              {DASHBOARD_COLOR_OPTIONS.map((color) => {
                const isSelected = color === selectedColor;
                return (
                  <button
                    key={color}
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`Select ${color} tint`}
                    onClick={() => setSelectedColor(color)}
                    className={`h-9 w-9 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 ${
                      isSelected
                        ? "border-[#00327d] shadow-none"
                        : "border-[rgba(25,28,30,0.12)] hover:-translate-y-0.5 hover:shadow-sm"
                    }`}
                    style={{
                      backgroundColor: color,
                      boxShadow: isSelected ? `0 0 0 2px ${color}` : undefined,
                    }}
                  />
                );
              })}
            </div>
          </div>

          <div className="rounded-[20px] border border-transparent bg-[var(--color-surface-muted)] p-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              Preview
            </p>
            <div className="flex items-center gap-3">
              <div
                className="flex h-11 w-11 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: `${selectedColor}20`,
                  color: selectedColor,
                }}
              >
                {previewIcon}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
                  {name || "Untitled dashboard"}
                </p>
                <p className="text-xs text-[var(--color-text-muted)]">
                  This is how it will appear in your workspace.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              className="h-10 rounded-full px-4 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim()}
              className="h-10 rounded-full px-5 text-sm text-white shadow-none transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#00327d" }}
            >
              Create Dashboard
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
