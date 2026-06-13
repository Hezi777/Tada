"use client";

import { type Key, useEffect, useMemo, useRef, useState } from "react";
import {
  Camera,
  Check,
  CreditCard,
  Globe,
  Monitor,
  Moon,
  Paintbrush,
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
} from "@/shared/ui/alert-dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { createClient } from "@/shared/lib/supabase/client";
import { listDashboards } from "@/shared/lib/api";
import {
  languageCodeFromLabel,
  persistLanguageCode,
} from "@/features/dashboard/client/locale";
import { useTranslation, type TranslationKey } from "@/shared/i18n";

type ThemeMode = "system" | "light" | "dark";
type SettingsSection = "profile" | "appearance" | "language" | "account";

type AccountStatus = { tone: "success" | "error"; text: string } | null;

const THEME_STORAGE_KEY = "tada-theme";
const THEME_EVENT = "tada-theme-change";
const DASHBOARD_LIMIT = 5;

const SETTINGS_NAV: Array<{
  key: SettingsSection;
  labelKey: TranslationKey;
  icon: typeof UserRound;
}> = [
  { key: "profile", labelKey: "settings.nav.profile", icon: UserRound },
  { key: "appearance", labelKey: "settings.nav.appearance", icon: Paintbrush },
  { key: "language", labelKey: "settings.nav.language", icon: Globe },
  { key: "account", labelKey: "settings.nav.account", icon: CreditCard },
];

const LANGUAGE_OPTIONS = ["English (US)", "Hebrew (IL)"];

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

function deriveNameParts(
  email: string | null,
  metadata: Record<string, unknown>,
) {
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

  const cleaned =
    email
      .split("@")[0]
      ?.replace(/[._-]+/g, " ")
      .trim() ?? "";
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
  key?: Key;
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
      <Icon
        className={`h-4 w-4 ${active ? "text-[var(--color-accent)]" : ""}`}
      />
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
      className={`relative rounded-[20px] border-2 p-3 text-left transition-all ${
        active
          ? "border-[var(--color-accent)] bg-card shadow-[0_18px_40px_-30px_rgba(0,50,125,0.35)]"
          : "border-transparent bg-[var(--color-surface-muted)] hover:border-[rgba(25,28,30,0.12)]"
      }`}
    >
      <div
        className={`mb-3 aspect-video overflow-hidden rounded-xl border ${
          mode === "dark"
            ? "border-[rgba(25,28,30,0.2)] bg-[#191c1e]"
            : mode === "system"
              ? "border-[rgba(25,28,30,0.12)] bg-gradient-to-br from-white via-[var(--color-surface-muted)] to-[#191c1e]"
              : "border-[rgba(25,28,30,0.12)] bg-white"
        }`}
      >
        <div className="space-y-1.5 p-3">
          <div
            className={`h-2 rounded-full ${
              mode === "dark"
                ? "bg-[rgba(255,255,255,0.16)]"
                : "bg-[var(--color-surface-muted)]"
            }`}
            style={{ width: "72%" }}
          />
          <div
            className={`h-2 rounded-full ${
              mode === "dark"
                ? "bg-[rgba(255,255,255,0.08)]"
                : "bg-[var(--color-surface-subtle)]"
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
  const { t } = useTranslation();
  const supabase = useMemo(() => createClient(), []);
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("profile");
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState<string | null>(
    null,
  );

  const profileRef = useRef<HTMLElement | null>(null);
  const appearanceRef = useRef<HTMLElement | null>(null);
  const languageRef = useRef<HTMLElement | null>(null);
  const accountRef = useRef<HTMLElement | null>(null);

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
      const storedLanguage =
        typeof metadata.language_preference === "string" &&
        LANGUAGE_OPTIONS.includes(metadata.language_preference)
          ? metadata.language_preference
          : LANGUAGE_OPTIONS[0];
      setLanguagePreference(storedLanguage);
      persistLanguageCode(languageCodeFromLabel(storedLanguage));
      setAvatarUrl(
        typeof metadata.avatar_url === "string" ? metadata.avatar_url : null,
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
      section === "profile"
        ? profileRef
        : section === "appearance"
          ? appearanceRef
          : section === "language"
            ? languageRef
            : accountRef;

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
          error instanceof Error
            ? error.message
            : "Unable to save your profile.",
      });
    } finally {
      setIsSavingAccount(false);
    }
  }

  async function handleAvatarUpload(file: File) {
    if (!userId) {
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAccountStatus({
        tone: "error",
        text: "Profile pictures must be under 2MB.",
      });
      return;
    }

    setIsUploadingAvatar(true);
    setAccountStatus(null);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${userId}/avatar.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      // Cache-bust so the new image shows immediately.
      const url = `${data.publicUrl}?v=${Date.now()}`;
      const { error: updateError } = await supabase.auth.updateUser({
        data: { ...userMetadata, avatar_url: url },
      });
      if (updateError) {
        throw updateError;
      }

      setUserMetadata((current) => ({ ...current, avatar_url: url }));
      setAvatarUrl(url);
      setAccountStatus({ tone: "success", text: "Profile picture updated." });
    } catch (error) {
      setAccountStatus({
        tone: "error",
        text:
          error instanceof Error
            ? error.message
            : "Unable to upload your picture.",
      });
    } finally {
      setIsUploadingAvatar(false);
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
    <div className="dashboard-scroll flex h-full flex-col overflow-y-auto bg-[var(--color-bg)] px-6 py-10 sm:px-8">
      <h1 className="font-display text-[2.25rem] font-black tracking-[-0.045em] text-[var(--color-text-primary)]">
        {t("settings.title")}
      </h1>

      <div className="mt-10 flex flex-col gap-10 md:flex-row">
        <aside className="w-full md:w-[200px] md:flex-shrink-0">
          <div className="md:sticky md:top-8">
            <nav className="space-y-1">
              {SETTINGS_NAV.map(({ key, labelKey, icon }) => (
                <SectionNavItem
                  key={key}
                  active={activeSection === key}
                  icon={icon}
                  label={t(labelKey)}
                  onClick={() => scrollToSection(key)}
                />
              ))}
            </nav>
          </div>
        </aside>

        <div className="flex-1 space-y-8">
          <section
            ref={profileRef}
            className="rounded-[20px] border border-[var(--color-border)] bg-card p-8 shadow-premium"
          >
            <div className="mb-6">
              <h2 className="flex items-center gap-2 font-display text-[1.375rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                <UserRound className="h-5 w-5 text-[var(--color-accent)]" />
                {t("settings.profile.heading")}
              </h2>
              <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                {t("settings.profile.desc")}
              </p>
            </div>

            <div className="mb-8 flex items-center gap-5">
              <div className="relative">
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={avatarUrl}
                    alt="Profile picture"
                    className="h-20 w-20 rounded-full object-cover shadow-sm"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
                    <UserRound className="h-9 w-9" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  aria-label="Change profile picture"
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent)] text-white shadow-sm transition hover:bg-[var(--color-accent-secondary)] disabled:opacity-60"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) {
                      void handleAvatarUpload(file);
                    }
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Profile picture
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                  {isUploadingAvatar
                    ? "Uploading..."
                    : "PNG, JPG, or WebP up to 2MB."}
                </p>
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
                  className="h-11 rounded-[8px] border border-[var(--color-border)] bg-card px-4 text-sm shadow-none focus-visible:ring-[var(--color-accent)]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Last Name
                </label>
                <Input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  className="h-11 rounded-[8px] border border-[var(--color-border)] bg-card px-4 text-sm shadow-none focus-visible:ring-[var(--color-accent)]"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                  Email Address
                </label>
                <Input
                  value={email ?? ""}
                  readOnly
                  className="h-11 rounded-[8px] border-transparent bg-[var(--color-surface-subtle)] px-4 text-sm text-[var(--color-text-secondary)] shadow-none focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {accountStatus ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {accountStatus.text}
                </p>
              ) : null}
              <Button
                type="button"
                onClick={() => {
                  void handleSaveAccount();
                }}
                disabled={isSavingAccount}
                className="h-10 rounded-full bg-[var(--color-accent)] px-6 text-sm font-semibold text-white hover:bg-[var(--color-accent-secondary)]"
              >
                {isSavingAccount ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </section>

          <section
            ref={appearanceRef}
            className="rounded-[20px] border border-[var(--color-border)] bg-card p-8 shadow-premium"
          >
            <h2 className="flex items-center gap-2 font-display text-[1.375rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
              <Paintbrush className="h-5 w-5 text-[var(--color-accent)]" />
              {t("settings.appearance.heading")}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {t("settings.appearance.desc")}
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
            ref={languageRef}
            className="rounded-[20px] border border-[var(--color-border)] bg-card p-8 shadow-premium"
          >
            <h2 className="flex items-center gap-2 font-display text-[1.375rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
              <Globe className="h-5 w-5 text-[var(--color-accent)]" />
              {t("settings.language.heading")}
            </h2>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {t("settings.language.desc")}
            </p>

            <div className="mt-6 max-w-sm space-y-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-muted)]">
                {t("settings.language.label")}
              </label>
              <select
                value={languagePreference}
                onChange={(event) => {
                  const next = event.target.value;
                  setLanguagePreference(next);
                  persistLanguageCode(languageCodeFromLabel(next));
                }}
                className="h-11 w-full rounded-[8px] border border-[var(--color-border)] bg-card px-4 text-sm text-foreground outline-none transition focus-visible:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[rgba(0,50,125,0.12)]"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {accountStatus ? (
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {accountStatus.text}
                </p>
              ) : null}
              <Button
                type="button"
                onClick={() => {
                  void handleSaveAccount();
                }}
                disabled={isSavingAccount}
                className="h-10 rounded-full bg-[var(--color-accent)] px-6 text-sm font-semibold text-white hover:bg-[var(--color-accent-secondary)]"
              >
                {isSavingAccount ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </section>

          <section
            ref={accountRef}
            className="rounded-[20px] border border-[var(--color-border)] bg-card p-8 shadow-premium"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 font-display text-[1.375rem] font-extrabold tracking-[-0.03em] text-[var(--color-text-primary)]">
                  <CreditCard className="h-5 w-5 text-[var(--color-accent)]" />
                  {t("settings.account.heading")}
                </h2>
                <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
                  Manage your plan, workspace capacity, and account access.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[var(--color-surface-subtle)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)]">
                  Free Plan
                </span>
                <span className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                  ID {userId ? truncateUuid(userId) : "Pending"}
                </span>
              </div>
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

            <div className="mt-8 flex flex-col gap-6 rounded-[16px] bg-[var(--color-surface-muted)] px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
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
                className="h-10 rounded-full bg-[var(--color-accent)] px-6 text-sm font-semibold text-white hover:bg-[var(--color-accent-secondary)]"
              >
                Upgrade Now
              </Button>
            </div>

            {billingMessage ? (
              <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
                {billingMessage}
              </p>
            ) : null}

            <div className="mt-8 rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Delete account
                  </p>
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                    Permanently remove your workspace access and stored data.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isDeleting}
                  className="h-10 rounded-full border border-[var(--color-border)] bg-card px-5 text-sm font-semibold text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)]"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete account
                </Button>
              </div>
            </div>

            {deleteErrorMessage ? (
              <div className="mt-4 rounded-[16px] bg-[var(--color-surface-muted)] px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                {deleteErrorMessage}
              </div>
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
              className="bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-secondary)]"
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
