"use client";

import * as React from "react";
import { Check, ChevronDown, Plus, Search } from "lucide-react";
import type { DashboardListItem } from "@tada/shared";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getIconComponent } from "@/components/app/CreateDashboardModal";

type DashboardSwitcherProps = {
  dashboards: DashboardListItem[];
  activeDashboardId: string | null;
  activeDashboardName: string | null;
  activeDashboardIcon: string | null;
  fallbackLabel?: string | null;
  onSwitchDashboard: (dashboard: DashboardListItem) => void;
  onCreateDashboard: () => void;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
};

export function DashboardSwitcher({
  dashboards,
  activeDashboardId,
  activeDashboardName,
  activeDashboardIcon,
  fallbackLabel = "No dashboard",
  onSwitchDashboard,
  onCreateDashboard,
  className,
  triggerClassName,
  contentClassName,
  disabled = false,
}: DashboardSwitcherProps) {
  const [open, setOpen] = React.useState(false);

  function handleSwitch(dashboard: DashboardListItem) {
    onSwitchDashboard(dashboard);
    setOpen(false);
  }

  function handleCreate() {
    setOpen(false);
    onCreateDashboard();
  }

  const triggerLabel = activeDashboardName ?? fallbackLabel;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 max-w-[240px] gap-2 rounded-full border border-transparent bg-[var(--color-surface-muted)] px-3 text-[12px] font-medium text-[var(--color-text-secondary)] shadow-none transition-colors hover:text-[var(--color-text-primary)] data-[state=open]:bg-white data-[state=open]:text-[var(--color-text-primary)]",
            className,
            triggerClassName,
          )}
        >
          {activeDashboardIcon ? (
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[var(--color-accent)]"
            >
              {React.createElement(getIconComponent(activeDashboardIcon), {
                className: "h-3.5 w-3.5",
              })}
            </span>
          ) : (
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
              <Search className="h-3.5 w-3.5" />
            </span>
          )}
          <span className="min-w-0 truncate">{triggerLabel}</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className={cn(
          "w-[340px] rounded-[20px] border border-transparent bg-white p-0 shadow-[0_32px_64px_-42px_rgba(25,28,30,0.18)]",
          contentClassName,
        )}
      >
        <Command className="rounded-md">
          <div className="px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Switch dashboard
              </p>
              <p className="text-xs text-[var(--color-text-secondary)]">
                {dashboards.length} dashboard{dashboards.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>
          <CommandInput placeholder="Search dashboards..." />
          <CommandList>
            <CommandEmpty>No dashboards found.</CommandEmpty>
            <CommandGroup heading="Dashboards">
              {dashboards.map((dashboard) => {
                const Icon = getIconComponent(dashboard.icon);
                const isActive = dashboard.id === activeDashboardId;

                return (
                  <CommandItem
                    key={dashboard.id}
                    value={`${dashboard.name} ${dashboard.fileCount}`}
                    onSelect={() => handleSwitch(dashboard)}
                    className="group flex items-center gap-3 px-3 py-2.5"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)]"
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">
                          {dashboard.name}
                        </span>
                        {isActive ? (
                          <span className="rounded-full bg-[#191c1e] px-2 py-0.5 text-[10px] font-medium text-white">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-[var(--color-text-secondary)]">
                        {dashboard.fileCount} file
                        {dashboard.fileCount === 1 ? "" : "s"}
                      </p>
                    </div>
                    {isActive ? (
                      <Check className="h-4 w-4 shrink-0 text-[#191c1e]" />
                    ) : null}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup heading="Actions">
            <CommandItem
              onSelect={handleCreate}
              className="flex items-center gap-3 px-3 py-2.5"
            >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]">
                  <Plus className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[var(--color-text-primary)]">
                    New dashboard
                  </span>
                  <span className="block text-xs text-[var(--color-text-secondary)]">
                    Create a dashboard for this dataset
                  </span>
                </div>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
