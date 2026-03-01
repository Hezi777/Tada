"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const { error: authError } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError(authError.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <div className="flex min-h-screen">
      {/* Left branded panel */}
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-[#0F172A] p-12 lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3B82F6]/20 via-transparent to-[#8B5CF6]/10" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-[#3B82F6]/8 blur-3xl" />
        <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-[#3B82F6]/12 blur-3xl" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3B82F6] shadow-[0_2px_12px_rgba(59,130,246,0.4)]">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <span className="text-lg font-bold text-white">TADA</span>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="font-display text-4xl leading-tight text-white">
            Instant dashboards
            <br />
            from your data.
          </h2>
          <p className="mt-4 max-w-sm text-[15px] leading-7 text-white/60">
            Upload any CSV or Excel file and get an AI-generated dashboard with
            charts, KPIs, and a conversational AI — in seconds.
          </p>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-white/30">
            © 2026 TADA. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-[#F8FAFC] px-6">
        <div className="w-full max-w-[400px]">
          {/* Mobile logo */}
          <div className="mb-10 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3B82F6]">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <span className="text-lg font-bold text-[#0F172A]">TADA</span>
          </div>

          <h1 className="font-display text-3xl text-[#0F172A]">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-[15px] text-[#64748B]">
            {isSignUp
              ? "Start building dashboards in seconds"
              : "Sign in to your workspace"}
          </p>

          <div className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
                Email
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm text-[#0F172A] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[#64748B]">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-xl border border-[#E2E8F0] bg-white px-4 text-sm text-[#0F172A] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 placeholder:text-[#94A3B8] focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
              />
            </div>
            {error ? (
              <p className="text-sm font-medium text-red-500">{error}</p>
            ) : null}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="h-12 w-full rounded-xl bg-[#3B82F6] text-sm font-semibold text-white shadow-[0_2px_8px_rgba(59,130,246,0.3)] transition-all duration-200 hover:bg-[#2563EB] hover:shadow-[0_4px_16px_rgba(59,130,246,0.35)] active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Loading..." : isSignUp ? "Create account" : "Sign in"}
            </button>
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="w-full py-2 text-sm text-[#64748B] transition-colors duration-150 hover:text-[#0F172A]"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
