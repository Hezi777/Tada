"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.43.34-2.1V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.16-3.16A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    setNotice(null);

    if (isSignUp) {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        },
      });
      if (authError) {
        setError(authError.message);
      } else if (!data.session) {
        // Email confirmation is enabled in Supabase: no session until the
        // user clicks the link.
        setNotice("Check your inbox - we sent you a confirmation link.");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) {
      setError(authError.message);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
    setLoading(false);
  }

  async function handleGoogleSignIn() {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });
    if (authError) {
      setError(authError.message);
    }
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
            AI dashboards
            <br />
            from your data.
          </h2>
          <p className="mt-4 text-[15px] leading-7 text-white/70">
            Upload any CSV, Excel, or PDF file and get an AI-generated dashboard
            with charts, KPIs, and a conversational AI in seconds.
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

            <form
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSubmit();
              }}
            >
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
                >
                  Email
                </label>
                <input
                  id="login-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12 w-full rounded-[1.1rem] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(0,50,125,0.12)]"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1.5 block text-xs font-medium text-[var(--color-text-secondary)]"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  type="password"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12 w-full rounded-[1.1rem] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-text-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 placeholder:text-[var(--color-text-muted)] focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[rgba(0,50,125,0.12)]"
                />
              </div>

              {error ? (
                <p className="text-sm font-medium text-red-500">{error}</p>
              ) : null}
              {notice ? (
                <p className="text-sm font-medium text-[var(--color-accent)]">
                  {notice}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="h-12 w-full rounded-[1.1rem] bg-[var(--color-accent)] text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(0,50,125,0.7)] transition-all duration-200 hover:bg-[var(--color-accent-secondary)] active:scale-[0.98] disabled:opacity-50"
              >
                {loading
                  ? "Loading..."
                  : isSignUp
                    ? "Create account"
                    : "Sign in"}
              </button>

              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-[var(--color-border)]" />
                <span className="text-xs text-[var(--color-text-muted)]">
                  or
                </span>
                <span className="h-px flex-1 bg-[var(--color-border)]" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-[1.1rem] border border-[var(--color-border)] bg-white text-sm font-semibold text-[var(--color-text-primary)] transition-all duration-200 hover:bg-[var(--color-bg)] active:scale-[0.98] disabled:opacity-50"
              >
                <GoogleIcon />
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full py-2 text-sm text-[var(--color-text-secondary)] transition-colors duration-150 hover:text-[var(--color-text-primary)]"
              >
                {isSignUp
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Sign up"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
