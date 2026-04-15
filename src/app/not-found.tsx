"use client";

import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/shared/ui/button";

export default function NotFound() {
  const pathname = usePathname();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      pathname,
    );
  }, [pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 gradient-glow" />
      <div className="pointer-events-none absolute inset-x-8 bottom-10 top-10 editorial-grid opacity-60" />

      <div className="container relative">
        <div className="mx-auto max-w-3xl section-shell px-8 py-14 text-center sm:px-14">
          <div className="eyebrow mb-6">Route Not Found</div>
          <p className="text-sm font-semibold uppercase tracking-[0.34em] text-primary/80">
            404
          </p>
          <h1 className="mt-4 text-5xl text-foreground sm:text-6xl">
            This page drifted off the dashboard.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            The route{" "}
            <span className="font-semibold text-foreground">{pathname}</span>{" "}
            does not exist in this app. Head back to the main experience and
            keep exploring.
          </p>
          <div className="mt-10 flex justify-center">
            <Button asChild size="lg">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
