"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Header } from "@/app/(marketing)/_components/Header";
import { Hero } from "@/app/(marketing)/_components/Hero";
import { BrandMarquee } from "@/app/(marketing)/_components/BrandMarquee";
import { Features } from "@/app/(marketing)/_components/Features";
import { HowItWorks } from "@/app/(marketing)/_components/HowItWorks";
import { FAQ } from "@/app/(marketing)/_components/FAQ";
import { CTA } from "@/app/(marketing)/_components/CTA";
import { Footer } from "@/app/(marketing)/_components/Footer";
import { createClient } from "@/shared/lib/supabase/client";

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
