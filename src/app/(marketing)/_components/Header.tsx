"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
import { TadaLogo } from "@/shared/brand/TadaLogo";

interface HeaderProps {
  isAuthenticated?: boolean;
  userEmail?: string | null;
  onLogin?: () => void;
  onGetStarted?: () => void;
  onOpenWorkspace?: () => void;
}

function getDisplayInitial(email: string | null): string {
  if (!email) {
    return "T";
  }
  return email.trim().charAt(0).toUpperCase() || "T";
}

export function Header({
  isAuthenticated = false,
  userEmail = null,
  onLogin,
  onGetStarted,
  onOpenWorkspace,
}: HeaderProps) {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);

  const handleLogin = onLogin ?? (() => router.push("/login"));
  const handleGetStarted = onGetStarted ?? (() => router.push("/login"));
  const handleOpenWorkspace =
    onOpenWorkspace ?? (() => router.push("/dashboard"));

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 80);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      // No static border-b class — border colour is driven entirely by animate
      // so it's invisible (transparent) when unscrolled and subtle when scrolled.
      className="fixed left-0 right-0 top-0 z-50 border-b border-transparent"
      initial={{ y: -60, opacity: 0 }}
      animate={
        scrolled
          ? {
              y: 0,
              opacity: 1,
              backgroundColor: "rgba(255,255,255,0.9)",
              borderColor: "hsla(214, 34%, 88%, 1)",
              backdropFilter: "blur(12px)",
            }
          : {
              y: 0,
              opacity: 1,
              backgroundColor: "rgba(255,255,255,0)",
              borderColor: "hsla(214, 34%, 88%, 0)",
              backdropFilter: "blur(0px)",
            }
      }
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <TadaLogo className="h-7 w-7 text-[var(--color-accent)]" />
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-1.5">
              <span className="font-sans text-lg font-semibold text-foreground">
                Tada
              </span>
              {/* Inline beta indicator */}
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" />
              <span className="text-xs font-medium text-primary">Beta</span>
            </div>
            <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-primary/80">
              Instant Insights
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center gap-6 md:flex">
          <Link
            href="/#features"
            className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="/#how-it-works"
            className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            How it works
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            About
          </Link>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {getDisplayInitial(userEmail)}
              </div>
              <Button variant="default" size="sm" onClick={handleOpenWorkspace}>
                Open workspace
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleLogin}>
                Log in
              </Button>
              <Button variant="default" size="sm" onClick={handleGetStarted}>
                Get started
              </Button>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
}
