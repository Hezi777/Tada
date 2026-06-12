"use client";

import { ArrowRight, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/shared/ui/button";
import { AnimatedDashboardMockup } from "./AnimatedDashboardMockup";

interface HeroProps {
  onGetStarted: () => void;
}

const easeOut = { ease: "easeOut" } as const;

export function Hero({ onGetStarted }: HeroProps) {
  const shouldReduceMotion = useReducedMotion();
  const rise = (delay: number) => ({
    initial: shouldReduceMotion ? { opacity: 0 } : { y: 60, opacity: 0 },
    animate: shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 },
    transition: { duration: 0.8, delay, ...easeOut },
  });

  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pb-10 pt-28 sm:px-6">
      <div className="absolute inset-0 gradient-glow pointer-events-none" />
      <div className="editorial-grid absolute inset-x-8 top-16 bottom-6 pointer-events-none opacity-70" />
      {!shouldReduceMotion && (
        <>
          <div className="absolute left-[10%] top-28 h-40 w-40 rounded-full bg-primary/10 blur-3xl animate-float" />
          <div
            className="absolute bottom-16 right-[8%] h-56 w-56 rounded-full bg-primary/12 blur-3xl animate-float"
            style={{ animationDelay: "-3s" }}
          />
        </>
      )}

      <div className="container relative z-10">
        <div className="grid items-center gap-12 py-10 lg:grid-cols-[1.1fr_0.72fr] lg:gap-16 lg:py-16">
          <div className="max-w-3xl">
            {/* eyebrow */}
            <motion.div className="eyebrow mb-6" {...rise(0)}>
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00327d,#22c55e)]">
                <Sparkles className="h-3 w-3 text-white" />
              </span>
              AI-generated dashboards
            </motion.div>

            {/* h1 */}
            <motion.h1
              className="text-5xl leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
              {...rise(0.08)}
            >
              Turn raw spreadsheets into a clear, living story for your team.
            </motion.h1>

            {/* paragraph */}
            <motion.p
              className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl"
              {...rise(0.2)}
            >
              Upload any CSV or Excel file, generate a polished dashboard in
              seconds, and keep exploring through plain-English questions that
              reshape the view as you think.
            </motion.p>

            {/* button row */}
            <motion.div
              className="mt-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center"
              {...rise(0.32)}
            >
              <Button variant="hero" size="xl" onClick={onGetStarted}>
                Get started free
                <ArrowRight className="ms-1 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" onClick={onGetStarted}>
                Try with sample data
              </Button>
            </motion.div>
          </div>

          {/* right-side mockup */}
          <motion.div
            className="relative flex justify-center lg:justify-end"
            initial={
              shouldReduceMotion ? { opacity: 0 } : { x: 50, opacity: 0 }
            }
            animate={shouldReduceMotion ? { opacity: 1 } : { x: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.2, ...easeOut }}
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
            <AnimatedDashboardMockup />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
