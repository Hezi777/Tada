"use client";

import Image from "next/image";
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
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-[linear-gradient(145deg,#00327D_0%,#1A237E_100%)] p-12 lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-white/5" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/8 blur-3xl" />
        <div className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <Image
            src="/tada-logo.svg"
            alt="Tada"
            width={40}
            height={40}
            priority
            className="h-10 w-auto"
          />
          <div>
            <div className="text-lg font-bold text-white">Tada</div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-white/65">
              Workspace
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl leading-tight text-white">
            Instant dashboards
            <br />
            from your data.
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-white/70">
            Upload any CSV or Excel file and get an AI-generated dashboard with
            charts, KPIs, and a conversational AI in seconds.
          </p>
        </div>

        <div className="relative z-10 text-xs text-white/35">
          © 2026 Tada. All rights reserved.
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <Image
              src="/tada-logo.svg"
              alt="Tada"
              width={32}
              height={32}
              className="h-8 w-auto"
            />
            <span className="text-lg font-bold text-[var(--color-text-primary)]">
              Tada
            </span>
          </div>

          <div className="dashboard-surface rounded-[2rem] p-8 shadow-none">
            <div className="mb-6 flex justify-center">
              <Image
                src="/tada-logo.svg"
                alt="Tada"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
            </div>
            <h1 className="font-display text-3xl text-[var(--color-text-primary)]">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-[15px] text-[var(--color-text-secondary)]">
              {isSignUp
                ? "Start building dashboards in seconds."
                : "Sign in to your workspace."}
            </p>

            <div className="mt-8 space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-[1.1rem] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(0,50,125,0.12)]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]">
                  Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-[1.1rem] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(0,50,125,0.12)]"
                />
              </div>

              {error ? (
                <p className="text-sm font-medium text-red-500">{error}</p>
              ) : null}

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="h-12 w-full rounded-[1.1rem] bg-[var(--color-accent)] text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(0,50,125,0.7)] transition-all duration-200 hover:bg-[var(--color-accent-secondary)] active:scale-[0.98] disabled:opacity-50"
              >
                {loading
                  ? "Loading..."
                  : isSignUp
                    ? "Create account"
                    : "Sign in"}
              </button>

              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full py-2 text-sm text-[var(--color-text-secondary)] transition-colors duration-150 hover:text-[var(--color-text-primary)]"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
