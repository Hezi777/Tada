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

const BARS = [42, 58, 50, 72, 64, 90] as const;
const HIGHLIGHT_INDEX = BARS.length - 1;

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
      className={`relative w-full max-w-[520px] ${shouldReduceMotion ? "" : "animate-bob"}`}
    >
      {/* Glow behind the mockup */}
      <div className="absolute -inset-6 rounded-[2.5rem] bg-primary/20 blur-3xl" />
      <div className="absolute -inset-x-10 bottom-0 h-40 rounded-[2.5rem] bg-emerald-400/10 blur-3xl" />

      {/* Main Glass Panel */}
      <div className="relative flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-white/40 p-5 shadow-premium backdrop-blur-xl">
        {/* Top KPI row */}
        <div className="flex gap-4">
          <div className="flex-1 rounded-[1.25rem] border border-white/80 bg-white/70 p-4 shadow-sm">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-primary/70">
              Q3 Forecast
            </p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="display-number text-3xl text-foreground">
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
        <div className="relative h-56 w-full overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-muted-foreground">
              Revenue Trajectory
            </p>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-emerald-600">
              Live
            </span>
          </div>

          <div className="absolute bottom-4 left-4 right-4 top-12">
            {/* Grid lines */}
            <div className="absolute bottom-0 left-0 right-0 top-0 flex flex-col justify-between">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="w-full border-t border-border/50" />
              ))}
            </div>

            {/* SVG Area + Line Chart */}
            <svg
              className="absolute inset-0 h-[68%] w-full overflow-visible"
              viewBox="0 0 400 120"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="area-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2f6df6" stopOpacity="0.32" />
                  <stop offset="100%" stopColor="#2f6df6" stopOpacity="0" />
                </linearGradient>
                <linearGradient
                  id="line-gradient-stroke"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor="#00327d" />
                  <stop offset="55%" stopColor="#2f6df6" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
                <filter
                  id="line-glow"
                  x="-20%"
                  y="-50%"
                  width="140%"
                  height="200%"
                >
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Area under the curve */}
              <motion.path
                d="M 0 100 C 50 100, 80 80, 120 70 C 160 60, 200 85, 240 50 C 280 15, 320 30, 400 10 L 400 120 L 0 120 Z"
                fill="url(#area-gradient)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 1,
                  delay: shouldReduceMotion ? 0 : 0.5,
                }}
              />

              {/* The Line with glow + brand gradient */}
              <motion.path
                d="M 0 100 C 50 100, 80 80, 120 70 C 160 60, 200 85, 240 50 C 280 15, 320 30, 400 10"
                fill="none"
                stroke="url(#line-gradient-stroke)"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#line-glow)"
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
                stroke="#22c55e"
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

            {/* Gradient bars */}
            <div className="absolute bottom-0 left-0 right-0 flex h-[55%] items-end justify-between gap-2 px-1">
              {BARS.map((height, index) => {
                const isHighlight = index === HIGHLIGHT_INDEX;
                return (
                  <div
                    key={`${height}-${index}`}
                    className="relative flex-1"
                    style={{ height: "100%" }}
                  >
                    {isHighlight && (
                      <div className="absolute -inset-x-1 bottom-0 h-full rounded-t-lg bg-emerald-400/30 blur-md" />
                    )}
                    <motion.div
                      className={`absolute bottom-0 w-full rounded-t-lg ${
                        isHighlight
                          ? "bg-[linear-gradient(180deg,#22c55e,#14b8a6)] shadow-[0_0_18px_rgba(34,197,94,0.45)]"
                          : "bg-[linear-gradient(180deg,#2f6df6,#00327d)] opacity-80"
                      }`}
                      initial={{
                        height: shouldReduceMotion ? `${height}%` : "0%",
                      }}
                      animate={{ height: `${height}%` }}
                      transition={{
                        duration: 0.7,
                        delay: shouldReduceMotion ? 0 : 0.3 + index * 0.08,
                        ease: "easeOut",
                      }}
                    />
                  </div>
                );
              })}
            </div>
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
