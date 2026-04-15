"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { BrandMarquee } from "@/components/landing/BrandMarquee";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FAQ } from "@/components/landing/FAQ";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { createClient } from "@/lib/supabase/client";

export function LandingPageClient() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getUser().then(({ data }) => {
      if (!isMounted) {
        return;
      }
      setUser(data.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      if (!isMounted) {
        return;
      }
      setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleGetStarted = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    router.push("/dashboard");
  };

  const handleLogin = () => {
    router.push("/login");
  };

  const handleOpenWorkspace = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        userEmail={user?.email ?? null}
        isAuthenticated={Boolean(user)}
        onLogin={handleLogin}
        onGetStarted={handleGetStarted}
        onOpenWorkspace={handleOpenWorkspace}
      />
      <Hero onGetStarted={handleGetStarted} />
      <BrandMarquee />
      <Features />
      <HowItWorks />
      <FAQ />
      <CTA onGetStarted={handleGetStarted} />
      <Footer />
    </div>
  );
}
