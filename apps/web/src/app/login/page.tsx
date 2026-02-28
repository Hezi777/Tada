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
    <div className="flex min-h-screen items-center justify-center bg-[#F4F6FA]">
      <div className="w-full max-w-md rounded-xl border border-[#E2E8F0] bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB]">
            <span className="text-sm font-bold text-white">T</span>
          </div>
          <span className="text-lg font-bold text-[#0F172A]">TADA</span>
        </div>
        <h1 className="mb-1 text-xl font-semibold text-[#0F172A]">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mb-6 text-sm text-[#64748B]">
          {isSignUp ? "Start building dashboards in seconds" : "Sign in to your workspace"}
        </p>
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
          />
          {error ? <p className="text-sm text-red-500">{error}</p> : null}
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-lg bg-[#2563EB] py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : isSignUp ? "Create account" : "Sign in"}
          </button>
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="w-full text-sm text-[#64748B] hover:text-[#0F172A]"
          >
            {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
