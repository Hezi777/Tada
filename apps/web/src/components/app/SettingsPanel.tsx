"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CreditCard,
  Monitor,
  Moon,
  Paintbrush,
  Shield,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { listDashboards } from "@/lib/api";

type ThemeMode = "system" | "light" | "dark";
type SettingsSection = "account" | "appearance" | "billing" | "privacy";

type AccountStatus =
  | { tone: "success" | "error"; text: string }
  | null;

const THEME_STORAGE_KEY = "tada-theme";
const THEME_EVENT = "tada-theme-change";
const DASHBOARD_LIMIT = 5;

const SETTINGS_NAV: Array<{
  key: SettingsSection;
  label: string;
  icon: typeof UserRound;
}> = [
  { key: "account", label: "Account", icon: UserRound },
  { key: "appearance", label: "Appearance", icon: Paintbrush },
  { key: "billing", label: "Billing", icon: CreditCard },
  { key: "privacy", label: "Privacy", icon: Shield },
];

const LANGUAGE_OPTIONS = ["English (US)", "Hebrew (IL)", "Spanish (ES)"];

function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "light" || stored === "dark" || stored === "system"
    ? stored
    : "system";
}

function applyThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") {
    return;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const root = window.document.documentElement;
  const isDark = mode === "dark" || (mode === "system" && prefersDark);
  root.classList.toggle("dark", isDark);
}

function deriveNameParts(email: string | null, metadata: Record<string, unknown>) {
  const firstName =
    typeof metadata.first_name === "string"
      ? metadata.first_name
      : typeof metadata.firstName === "string"
        ? metadata.firstName
        : "";
  const lastName =
    typeof metadata.last_name === "string"
      ? metadata.last_name
      : typeof metadata.lastName === "string"
        ? metadata.lastName
        : "";

  if (firstName || lastName) {
    return {
      firstName,
      lastName,
    };
  }

  const fullName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : "";

  if (fullName.trim()) {
    const [first = "", ...rest] = fullName.trim().split(/\s+/);
    return {
      firstName: first,
      lastName: rest.join(" "),
    };
  }

  if (!email) {
    return { firstName: "", lastName: "" };
  }

  const cleaned = email.split("@")[0]?.replace(/[._-]+/g, " ").trim() ?? "";
  const [first = "", ...rest] = cleaned.split(/\s+/);

  return {
    firstName: first ? first[0].toUpperCase() + first.slice(1) : "",
    lastName: rest
      .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
      .join(" "),
  };
}

function truncateUuid(uuid: string): string {
  return uuid.length > 12 ? `${uuid.slice(0, 8)}...${uuid.slice(-4)}` : uuid;
}

function SectionNavItem({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof UserRound;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-10 w-full items-center gap-3 rounded-r-lg px-4 text-left text-sm transition-colors ${
        active
          ? "border-l-[3px] border-[var(--color-accent)] bg-[var(--color-surface-muted)] font-semibold text-[var(--color-text-primary)]"
          : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text-primary)]"
      }`}
    >
      <Icon className={`h-4 w-4 ${active ? "text-[var(--color-accent)]" : ""}`} />
      <span>{label}</span>
    </button>
  );
}

function ThemeOption({
  active,
  label,
  mode,
  onClick,
}: {
  active: boolean;
  label: string;
  mode: ThemeMode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-2xl border-2 p-3 text-left transition-all ${
        active
          ? "border-[var(--color-accent)] bg-white shadow-[0_18px_40px_-30px_rgba(0,50,125,0.35)]"
          : "border-transparent bg-[var(--color-surface-muted)] hover:border-[rgba(25,28,30,0.12)]"
      }`}
    >
      <div
        className={`mb-3 aspect-video overflow-hidden rounded-xl border ${
          mode === "dark"
            ? "border-slate-800 bg-slate-900"
            : mode === "system"
              ? "border-[rgba(25,28,30,0.12)] bg-gradient-to-br from-white via-slate-300 to-slate-900"
              : "border-[rgba(25,28,30,0.12)] bg-white"
        }`}
      >
        <div className="space-y-1.5 p-3">
          <div
            className={`h-2 rounded-full ${
              mode === "dark" ? "bg-slate-700" : "bg-slate-200"
            }`}
            style={{ width: "72%" }}
          />
          <div
            className={`h-2 rounded-full ${
              mode === "dark" ? "bg-slate-800" : "bg-slate-100"
            }`}
            style={{ width: "52%" }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span
          className={`text-sm ${
            active
              ? "font-semibold text-[var(--color-accent)]"
              : "font-medium text-[var(--color-text-secondary)]"
          }`}
        >
          {label}
        </span>
        {active ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-accent)] text-white">
            <Check className="h-3 w-3" />
          </span>
        ) : null}
      </div>
    </button>
  );
}

export function SettingsPanel() {
  const supabase = useMemo(() => createClient(), []);
  const [activeSection, setActiveSection] = useState<SettingsSection>("account");
  const [themeMode, setThemeMode] = useState<ThemeMode>(readThemeMode);
  const [email, setEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [dashboardCount, setDashboardCount] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [languagePreference, setLanguagePreference] = useState(
    LANGUAGE_OPTIONS[0],
  );
  const [userMetadata, setUserMetadata] = useState<Record<string, unknown>>({});
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
    null,
  );

  const accountRef = useRef<HTMLElement | null>(null);
  const appearanceRef = useRef<HTMLElement | null>(null);
  const billingRef = useRef<HTMLElement | null>(null);
  const privacyRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted || !data.user) {
        return;
      }

      const metadata = (data.user.user_metadata ?? {}) as Record<
        string,
        unknown
      >;
      const derivedName = deriveNameParts(data.user.email ?? null, metadata);

      setEmail(data.user.email ?? null);
      setUserId(data.user.id);
      setUserMetadata(metadata);
      setFirstName(derivedName.firstName);
      setLastName(derivedName.lastName);
      setLanguagePreference(
        typeof metadata.language_preference === "string"
          ? metadata.language_preference
          : LANGUAGE_OPTIONS[0],
      );
    });

    void listDashboards()
      .then((items) => {
        if (mounted) {
          setDashboardCount(items.length);
        }
      })
      .catch(() => {
        if (mounted) {
          setDashboardCount(0);
        }
      });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const usagePercent = Math.min(
    100,
    Math.round((dashboardCount / DASHBOARD_LIMIT) * 100),
  );

  function scrollToSection(section: SettingsSection) {
    setActiveSection(section);

    const targetRef =
      section === "account"
        ? accountRef
        : section === "appearance"
          ? appearanceRef
          : section === "billing"
            ? billingRef
            : privacyRef;

    targetRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleThemeChange(mode: ThemeMode) {
    setThemeMode(mode);
    applyThemeMode(mode);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode);
      window.dispatchEvent(new Event(THEME_EVENT));
    }
  }

  async function handleSaveAccount() {
    setIsSavingAccount(true);
    setAccountStatus(null);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          ...userMetadata,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          language_preference: languagePreference,
        },
      });

      if (error) {
        throw error;
      }

      setUserMetadata((current) => ({
        ...current,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        language_preference: languagePreference,
      }));
      setAccountStatus({ tone: "success", text: "Account details saved." });
    } catch (error) {
      setAccountStatus({
        tone: "error",
        text:
          error instanceof Error ? error.message : "Unable to save your profile.",
      });
    } finally {
      setIsSavingAccount(false);
    }
  }

  async function handleDeleteAccount() {
    setIsDeleting(true);
    setDeleteErrorMessage(null);

    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? "Failed to delete account",
        );
      }

      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error) {
      setDeleteErrorMessage(
        error instanceof Error ? error.message : "Something went wrong",
      );
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }

  return (
    <div className="dashboard-scroll flex h-full flex-col overflow-y-auto px-6 py-10 sm:px-8">
      <h1 className="font-display text-[2rem] font-bold tracking-[-0.04em] text-[var(--color-accent)]">
        Settings
      </h1>

      <div className="mt-10 flex flex-col gap-10 md:flex-row">
        <aside className="w-full md:w-[220px] md:flex-shrink-0">
          <div className="md:sticky md:top-8">
            <nav className="space-y-1">
              {SETTINGS_NAV.map(({ key, label, icon }) => (
                <SectionNavItem
                  key={key}
                  active={activeSection === key}
                  icon={icon}
                  label={label}
                  onClick={() => scrollToSection(key)}
                />
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex-1 space-y-8">
          <section
            ref={accountRef}
            className="rounded-[20px] bg-white p-8 shadow-[0_24px_48px_-36px_rgba(25,28,30,0.16)]"
          >
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 font-display text-[1.375rem] font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
                  <UserRound className="h-5 w-5 text-[var(--color-accent)]" />
                  Account Information
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  Manage the personal details tied to your Tada workspace.
                </p>
              </div>

              <div className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                ID {userId ? truncateUuid(userId) : "Pending"}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  First Name
                </label>
                <Input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  className="h-11 rounded-xl border-[rgba(25,28,30,0.12)] bg-white px-4 text-sm shadow-none focus-visible:ring-[var(--color-accent)]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Last Name
                </label>
                <Input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="h-11 rounded-xl border-[rgba(25,28,30,0.12)] bg-white px-4 text-sm shadow-none focus-visible:ring-[var(--color-accent)]"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Email Address
                </label>
                <Input
                  value={email ?? ""}
                  readOnly
                  className="h-11 rounded-xl border-transparent bg-[var(--color-surface-subtle)] px-4 text-sm text-[var(--color-text-secondary)] shadow-none focus-visible:ring-0"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Language Preference
                </label>
                <select
                  value={languagePreference}
                  onChange={(event) =>
                    setLanguagePreference(event.target.value)
                  }
                  className="h-11 w-full rounded-xl border border-[rgba(25,28,30,0.12)] bg-white px-4 text-sm text-[var(--color-text-primary)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(0,50,125,0.12)]"
                >
                  {LANGUAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {accountStatus ? (
                <p
                  className={`text-sm ${
                    accountStatus.tone === "success"
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {accountStatus.text}
                </p>
              ) : null}
              <Button
                type="button"
                onClick={() => {
                  void handleSaveAccount();
                }}
                disabled={isSavingAccount}
                className="h-10 rounded-full bg-[linear-gradient(135deg,#00327d,#0047ab)] px-6 text-sm font-semibold text-white hover:opacity-95"
              >
                {isSavingAccount ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </section>

          <section
            ref={appearanceRef}
            className="rounded-[20px] bg-white p-8 shadow-[0_24px_48px_-36px_rgba(25,28,30,0.16)]"
          >
            <h2 className="flex items-center gap-2 font-display text-[1.375rem] font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
              <Paintbrush className="h-5 w-5 text-[var(--color-accent)]" />
              Appearance
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Select how you want Tada to feel across your workspace.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <ThemeOption
                active={themeMode === "light"}
                label="Light"
                mode="light"
                onClick={() => handleThemeChange("light")}
              />
              <ThemeOption
                active={themeMode === "dark"}
                label="Dark"
                mode="dark"
                onClick={() => handleThemeChange("dark")}
              />
              <ThemeOption
                active={themeMode === "system"}
                label="System"
                mode="system"
                onClick={() => handleThemeChange("system")}
              />
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-[16px] bg-[var(--color-surface-muted)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">
              {themeMode === "light" ? (
                <Sun className="h-4 w-4 text-[var(--color-accent)]" />
              ) : themeMode === "dark" ? (
                <Moon className="h-4 w-4 text-[var(--color-accent)]" />
              ) : (
                <Monitor className="h-4 w-4 text-[var(--color-accent)]" />
              )}
              <span>
                {themeMode === "system"
                  ? "System mode follows your device preference."
                  : `Tada is using ${themeMode} mode.`}
              </span>
            </div>
          </section>

          <section
            ref={billingRef}
            className="rounded-[20px] bg-white p-8 shadow-[0_24px_48px_-36px_rgba(25,28,30,0.16)]"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 font-display text-[1.375rem] font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
                  <CreditCard className="h-5 w-5 text-[var(--color-accent)]" />
                  Billing &amp; Plan
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  Manage your plan and keep track of workspace capacity.
                </p>
              </div>

              <span className="rounded-full bg-[var(--color-surface-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)]">
                Free Plan
              </span>
            </div>

            <div className="mt-8">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--color-text-primary)]">
                  Workspace Usage
                </span>
                <span className="font-semibold text-[var(--color-accent)]">
                  {dashboardCount} of {DASHBOARD_LIMIT} dashboards
                </span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-[var(--color-surface-subtle)]">
                <div
                  className="h-full rounded-full bg-[var(--color-accent)]"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-6 rounded-[16px] bg-[rgba(0,50,125,0.06)] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-display text-xl font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
                  Upgrade to Pro
                </h3>
                <p className="mt-2 max-w-[32rem] text-sm leading-6 text-[var(--color-text-secondary)]">
                  Unlock unlimited dashboards, collaboration, and higher export
                  limits when billing is enabled.
                </p>
              </div>
              <Button
                type="button"
                onClick={() =>
                  setBillingMessage("Billing actions are not connected yet.")
                }
                className="h-10 rounded-full bg-[linear-gradient(135deg,#00327d,#0047ab)] px-6 text-sm font-semibold text-white hover:opacity-95"
              >
                Upgrade Now
              </Button>
            </div>

            {billingMessage ? (
              <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
                {billingMessage}
              </p>
            ) : null}
          </section>

          <section
            ref={privacyRef}
            className="rounded-[20px] bg-white p-8 shadow-[0_24px_48px_-36px_rgba(25,28,30,0.16)]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 font-display text-[1.375rem] font-bold tracking-[-0.03em] text-[var(--color-text-primary)]">
                  <Shield className="h-5 w-5 text-[var(--color-accent)]" />
                  Privacy
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  Permanently remove your account and the data linked to it.
                </p>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-4 rounded-[16px] bg-[rgba(220,38,38,0.06)] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Delete account
                </p>
                <p className="mt-1 text-sm leading-6 text-[var(--color-text-secondary)]">
                  This removes your account, dashboards, and related data from
                  Tada.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isDeleting}
                className="h-10 rounded-full border-[rgba(220,38,38,0.28)] bg-white px-5 text-sm font-semibold text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Delete account
              </Button>
            </div>

            {deleteErrorMessage ? (
              <p className="mt-4 text-sm text-red-600">{deleteErrorMessage}</p>
            ) : null}
          </section>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes your account and all associated data. It
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteAccount();
              }}
            >
              {isDeleting ? "Deleting..." : "Yes, delete my account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
