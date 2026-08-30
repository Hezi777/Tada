"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/client";
import { Button } from "@/shared/ui/button";

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

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-[45%] flex-col justify-between overflow-hidden bg-primary p-12 lg:flex">
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
            <span className="text-lg font-bold text-foreground">
              Tada
            </span>
          </div>

          <div className="rounded-lg border border-border bg-card p-8">
            <div className="mb-6 flex justify-center">
              <Image
                src="/tada-logo.svg"
                alt="Tada"
                width={40}
                height={40}
                className="h-10 w-auto"
              />
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {isSignUp ? "Create your account" : "Welcome back"}
            </h1>
            <p className="mt-2 text-[15px] text-muted-foreground">
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
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
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
                  className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground transition-colors duration-150 motion-reduce:transition-none placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-1.5 block text-xs font-medium text-muted-foreground"
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
                  className="h-12 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground transition-colors duration-150 motion-reduce:transition-none placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {error ? (
                <p className="text-sm font-medium text-destructive">{error}</p>
              ) : null}
              {notice ? (
                <p className="text-sm font-medium text-primary">
                  {notice}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full"
              >
                {loading
                  ? "Loading..."
                  : isSignUp
                    ? "Create account"
                    : "Sign in"}
              </Button>

              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full py-2 text-sm text-muted-foreground transition-colors duration-150 motion-reduce:transition-none hover:text-foreground"
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
