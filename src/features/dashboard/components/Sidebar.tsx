"use client";

import { type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CircleUserRound,
  FolderClosed,
  LayoutDashboard,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
} from "lucide-react";
import { useTranslation } from "@/shared/i18n";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { ScrollArea } from "@/shared/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip";
import { logout } from "@/features/auth/server/actions";

export type NavTab = "dashboard" | "dashboards" | "settings";

interface SidebarProps {
  activeTab: NavTab;
  onNavigate: (tab: NavTab) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  isRtl: boolean;
  avatarUrl: string | null;
  userEmail: string | null;
}

function NavLink({
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
      className={cn(
        "group flex h-10 w-full items-center gap-3 rounded-xl text-sm font-medium transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
        collapsed ? "w-10 justify-center px-0" : "px-3",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-raised"
          : "text-sidebar-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <span
        className={cn("shrink-0", active ? "text-primary" : "")}
        aria-hidden="true"
      >
        {icon}
      </span>
      {collapsed ? null : <span className="truncate">{label}</span>}
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

/** Round profile avatar in the footer card; opens settings. Tooltip when collapsed. */
function ProfileAvatar({
  avatarUrl,
  label,
  collapsed,
  onClick,
}: {
  avatarUrl: string | null;
  label: string;
  collapsed: boolean;
  onClick: () => void;
}) {
  const button = (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open settings"
      className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
    >
      {avatarUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img src={avatarUrl} alt="Your profile" className="h-full w-full object-cover" />
      ) : (
        <CircleUserRound className="h-5 w-5" />
      )}
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

/** Small footer icon button (settings) with active state; tooltip when collapsed. */
function IconAction({
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
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
        active
          ? "bg-sidebar-accent text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {icon}
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

export function Sidebar({
  activeTab,
  onNavigate,
  collapsed,
  onToggleCollapsed,
  isRtl,
  avatarUrl,
  userEmail,
}: SidebarProps) {
  const { t } = useTranslation();

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex h-full flex-col">
        {/* Logo header */}
        <div
          className={cn(
            "flex h-14 shrink-0 items-center gap-2",
            collapsed ? "justify-center px-2" : "px-5",
          )}
        >
          <Link
            href="/"
            aria-label="Tada home"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Image
              src="/tada-logo.svg"
              alt="Tada"
              width={28}
              height={28}
              priority
              className="h-7 w-7 shrink-0"
            />
            {collapsed ? null : (
              <span className="text-base font-semibold tracking-tight text-foreground">
                Tada
              </span>
            )}
          </Link>

          {collapsed ? null : (
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 motion-reduce:transition-none hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar",
                isRtl ? "mr-auto" : "ml-auto",
              )}
            >
              <PanelLeftClose className={cn("h-4 w-4", isRtl ? "rotate-180" : "")} />
            </button>
          )}
        </div>

        {collapsed ? (
          <div className="flex justify-center px-3 pb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={onToggleCollapsed}
                  aria-label="Expand sidebar"
                  className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground transition-colors duration-150 motion-reduce:transition-none hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
                >
                  <PanelLeftOpen className={cn("h-4 w-4", isRtl ? "rotate-180" : "")} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>
        ) : null}


        {/* Nav — main destinations only; account actions live in the footer. */}
        <ScrollArea className="flex-1">
          <nav className="flex flex-col gap-1 px-3 py-2">
            {collapsed ? null : (
              <div className="mb-1 px-3 text-xs font-medium text-muted-foreground">
                {t("nav.group.workspace")}
              </div>
            )}
            <NavLink
              label={t("nav.overview")}
              icon={<LayoutDashboard className="h-4 w-4" />}
              active={activeTab === "dashboard"}
              collapsed={collapsed}
              onClick={() => onNavigate("dashboard")}
            />
            <NavLink
              label={t("nav.files")}
              icon={<FolderClosed className="h-4 w-4" />}
              active={activeTab === "dashboards"}
              collapsed={collapsed}
              onClick={() => onNavigate("dashboards")}
            />
          </nav>
        </ScrollArea>

        {/* Footer */}
        <div className="shrink-0 border-t border-border p-3">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/pricing"
                  aria-label={t("shell.beta")}
                  className="mesh-teal shadow-premium flex items-center justify-center rounded-xl p-3 transition hover:opacity-90"
                >
                  <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
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
              <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                {t("shell.beta")}
              </span>
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {t("shell.betaNote")}
              </p>
            </Link>
          )}

          <div
            className={cn(
              "mt-3 flex gap-1.5 rounded-xl border border-border bg-card p-1.5",
              collapsed ? "flex-col items-center" : "items-center",
            )}
          >
            <ProfileAvatar
              avatarUrl={avatarUrl}
              label={userEmail ?? t("nav.settings")}
              collapsed={collapsed}
              onClick={() => onNavigate("settings")}
            />

            {collapsed ? null : (
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-muted-foreground">
                {userEmail ?? ""}
              </span>
            )}

            <IconAction
              label={t("nav.settings")}
              collapsed={collapsed}
              active={activeTab === "settings"}
              onClick={() => onNavigate("settings")}
              icon={<Settings className="h-4 w-4" />}
            />

            <form action={logout}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="submit"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                      aria-label="Logout"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Logout</TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  type="submit"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </form>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
