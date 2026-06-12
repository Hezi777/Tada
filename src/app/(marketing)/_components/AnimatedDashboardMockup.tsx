"use client";

import { useEffect, useState } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Sparkles, TrendingUp, Zap } from "lucide-react";

const KPI_TARGET = 148;

export function AnimatedDashboardMockup() {
  const shouldReduceMotion = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { duration: 2000, bounce: 0 });
  const rounded = useTransform(spring, (value) => Math.floor(value));
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (shouldReduceMotion) {
      return;
    }

    motionValue.set(KPI_TARGET);
    const unsubscribe = rounded.on("change", (value) => setCount(value));
    return () => unsubscribe();
  }, [motionValue, rounded, shouldReduceMotion]);

  const displayCount = shouldReduceMotion ? KPI_TARGET : count;

  return (
    <div
      className={`relative w-full max-w-[500px] ${shouldReduceMotion ? "" : "animate-bob"}`}
    >
      {/* Glow behind the mockup */}
      <div className="absolute -inset-4 rounded-[2.5rem] bg-primary/20 blur-3xl" />

      {/* Main Glass Panel */}
      <div className="relative flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-white/40 p-5 shadow-2xl backdrop-blur-xl">
        {/* Top KPI row */}
        <div className="flex gap-4">
          <div className="flex-1 rounded-[1.25rem] border border-white/80 bg-white/70 p-4 shadow-sm">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-primary/70">
              Q3 Forecast
            </p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-extrabold text-foreground">
                ${displayCount}k
              </span>
              <span className="flex items-center text-xs font-semibold text-emerald-500">
                <TrendingUp className="me-0.5 h-3 w-3" />
                +18%
              </span>
            </div>
          </div>
          <div className="flex-1 rounded-[1.25rem] border border-white/80 bg-primary/5 p-4 shadow-sm">
            <p className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-widest text-primary">
              <Sparkles className="h-3 w-3" />
              Insight
            </p>
            <div className="mt-2 w-full">
              <p className="animate-typing overflow-hidden whitespace-nowrap border-e-2 border-primary pe-2 text-xs font-medium text-foreground">
                Growth is accelerating in EMEA.
              </p>
            </div>
          </div>
        </div>

        {/* Chart Window */}
        <div className="relative h-48 w-full overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/80 p-4 shadow-sm">
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
            Revenue Trajectory
          </p>

          <div className="absolute bottom-4 left-4 right-4 top-10">
            {/* Grid lines */}
            <div className="absolute bottom-0 left-0 right-0 top-0 flex flex-col justify-between border-b border-border">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-full border-t border-border/60" />
              ))}
            </div>

            {/* SVG Line Chart */}
            <svg
              className="absolute inset-0 h-full w-full overflow-visible"
              viewBox="0 0 400 120"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity="0.2"
                  />
                  <stop
                    offset="100%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity="0"
                  />
                </linearGradient>
              </defs>

              {/* Area under the curve */}
              <motion.path
                d="M 0 100 C 50 100, 80 80, 120 70 C 160 60, 200 85, 240 50 C 280 15, 320 30, 400 10 L 400 120 L 0 120 Z"
                fill="url(#line-gradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 1,
                  delay: shouldReduceMotion ? 0 : 0.5,
                }}
              />

              {/* The Line */}
              <motion.path
                d="M 0 100 C 50 100, 80 80, 120 70 C 160 60, 200 85, 240 50 C 280 15, 320 30, 400 10"
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: shouldReduceMotion ? 1 : 0 }}
                animate={{ pathLength: 1 }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 2,
                  ease: "easeOut",
                }}
              />

              {/* Data point dot */}
              <motion.circle
                cx="400"
                cy="10"
                r="6"
                fill="white"
                stroke="hsl(var(--primary))"
                strokeWidth="3"
                initial={{
                  scale: shouldReduceMotion ? 1 : 0,
                  opacity: shouldReduceMotion ? 1 : 0,
                }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  duration: 0.5,
                  delay: shouldReduceMotion ? 0 : 1.8,
                  type: "spring",
                }}
              />
            </svg>
          </div>
        </div>

        {/* Fake Prompt Window */}
        <div className="flex items-center gap-3 rounded-[1.25rem] border border-white/60 bg-white/50 px-4 py-3 shadow-inner">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
            <Zap className="h-3 w-3" />
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            Show me revenue vs trailing 30 days...
          </p>
        </div>
      </div>
    </div>
  );
}
