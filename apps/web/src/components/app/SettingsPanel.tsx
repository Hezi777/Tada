"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Moon, Sun, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";

type SettingsTab = "account" | "appearance";

const TABS: { key: SettingsTab; label: string }[] = [
    { key: "account", label: "Account" },
    { key: "appearance", label: "Appearance" },
];

function truncateUuid(uuid: string): string {
    return uuid.length > 12 ? `${uuid.slice(0, 8)}…${uuid.slice(-4)}` : uuid;
}

export function SettingsPanel() {
    const supabase = useMemo(() => createClient(), []);
    const [activeTab, setActiveTab] = useState<SettingsTab>("account");
    const [email, setEmail] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data.user) {
                setEmail(data.user.email ?? null);
                setUserId(data.user.id);
            }
        });
    }, [supabase]);

    async function handleDeleteAccount() {
        setIsDeleting(true);
        setErrorMessage(null);
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
        } catch (err) {
            setErrorMessage(
                err instanceof Error ? err.message : "Something went wrong",
            );
            setIsDeleting(false);
            setDeleteDialogOpen(false);
        }
    }

    return (
        <div className="flex h-full flex-col p-8">
            {/* Page title */}
            <h1 className="font-display text-2xl text-[#0F172A]">Settings</h1>

            {/* Tab bar */}
            <div className="mt-6 flex items-center gap-1 border-b border-[#F1F5F9]">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        type="button"
                        onClick={() => setActiveTab(tab.key)}
                        className={`relative px-4 pb-3 pt-1 text-sm font-semibold transition-colors ${activeTab === tab.key
                            ? "text-[#3B82F6]"
                            : "text-[#94A3B8] hover:text-[#64748B]"
                            }`}
                    >
                        {tab.label}
                        {activeTab === tab.key && (
                            <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-[#3B82F6]" />
                        )}
                    </button>
                ))}
            </div>

            {/* Error banner */}
            {errorMessage && (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                    {errorMessage}
                </div>
            )}

            {/* Tab content */}
            <div className="mt-6 flex-1 overflow-y-auto">
                {activeTab === "account" ? (
                    <div className="space-y-6">
                        {/* ── Profile Card ── */}
                        <div className="overflow-hidden rounded-xl border border-[#E8ECF4] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
                            <div className="border-b border-[#F1F5F9] px-6 py-4">
                                <h2 className="text-[15px] font-semibold text-[#0F172A]">
                                    Profile
                                </h2>
                            </div>
                            <div className="space-y-4 px-6 py-5">
                                {/* Email */}
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-[#94A3B8]">
                                        Email
                                    </label>
                                    <div className="flex h-10 w-full max-w-sm items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-sm text-[#0F172A]">
                                        {email ?? "—"}
                                    </div>
                                </div>

                                {/* Account ID */}
                                <div>
                                    <label className="mb-1.5 block text-xs font-medium text-[#94A3B8]">
                                        Account ID
                                    </label>
                                    <div className="flex h-10 w-full max-w-sm items-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3 font-mono text-sm text-[#64748B]">
                                        {userId ? truncateUuid(userId) : "—"}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Danger Zone Card ── */}
                        <div className="overflow-hidden rounded-xl border border-red-200 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                            <div className="border-b border-red-100 px-6 py-4">
                                <h2 className="text-[15px] font-semibold text-red-600">
                                    Danger Zone
                                </h2>
                            </div>
                            <div className="flex items-center justify-between px-6 py-5">
                                <div>
                                    <p className="text-sm font-medium text-[#0F172A]">
                                        Delete account
                                    </p>
                                    <p className="mt-0.5 text-xs text-[#94A3B8]">
                                        Permanently remove your account and all associated data.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-2 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={() => setDeleteDialogOpen(true)}
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete account
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* ── Theme Card ── */}
                        <div className="overflow-hidden rounded-xl border border-[#E8ECF4] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
                            <div className="border-b border-[#F1F5F9] px-6 py-4">
                                <h2 className="text-[15px] font-semibold text-[#0F172A]">
                                    Theme
                                </h2>
                            </div>
                            <div className="grid grid-cols-1 gap-4 px-6 py-5 sm:grid-cols-2">
                                {/* Light — active */}
                                <button
                                    type="button"
                                    className="group relative flex flex-col items-center gap-3 rounded-xl border-2 border-[#3B82F6] bg-white p-5 text-center shadow-[0_0_0_1px_rgba(59,130,246,0.12)] transition-all"
                                >
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                                        <Sun className="h-6 w-6 text-[#3B82F6]" />
                                    </div>
                                    <span className="text-sm font-semibold text-[#0F172A]">
                                        Light
                                    </span>
                                    <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#3B82F6]">
                                        <Check className="h-3 w-3 text-white" />
                                    </span>
                                </button>

                                {/* Dark — disabled */}
                                <div className="relative flex cursor-not-allowed flex-col items-center gap-3 rounded-xl border border-[#E8ECF4] bg-[#F8FAFC] p-5 text-center opacity-60">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1F5F9]">
                                        <Moon className="h-6 w-6 text-[#94A3B8]" />
                                    </div>
                                    <span className="text-sm font-semibold text-[#94A3B8]">
                                        Dark
                                    </span>
                                    <Badge className="absolute right-2 top-2 border-0 bg-[#F1F5F9] text-[10px] font-semibold text-[#94A3B8] hover:bg-[#F1F5F9]">
                                        Coming soon
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        {/* ── Accent Color Card ── */}
                        <div className="overflow-hidden rounded-xl border border-[#E8ECF4] bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)]">
                            <div className="border-b border-[#F1F5F9] px-6 py-4">
                                <h2 className="text-[15px] font-semibold text-[#0F172A]">
                                    Accent Color
                                </h2>
                            </div>
                            <div className="flex items-center gap-4 px-6 py-5">
                                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#3B82F6] ring-2 ring-[#3B82F6] ring-offset-2">
                                    <Check className="h-4 w-4 text-white" />
                                </span>
                                <div>
                                    <p className="text-sm font-semibold text-[#0F172A]">
                                        TADA Blue
                                    </p>
                                    <p className="text-xs text-[#94A3B8]">#3B82F6</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Delete Account Dialog ── */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete your account and all associated data.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 text-white hover:bg-red-700"
                            disabled={isDeleting}
                            onClick={(e) => {
                                e.preventDefault();
                                void handleDeleteAccount();
                            }}
                        >
                            {isDeleting ? "Deleting…" : "Yes, delete my account"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
