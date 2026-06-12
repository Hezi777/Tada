"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { Card } from "@/shared/ui/card";

type ProcessingPhase = "profiling" | "generating";

interface ProcessingViewProps {
  phase: ProcessingPhase;
  onComplete: () => void;
  isReady: boolean;
}

const PHASE_CONTENT: Record<
  ProcessingPhase,
  {
    eyebrow: string;
    heading: string;
    blurb: string;
    note: string;
    steps: string[];
  }
> = {
  profiling: {
    eyebrow: "Step 1 of 2 · Reading",
    heading: "Scanning your dataset",
    blurb:
      "Tada is reading your file's structure and column types. You'll choose how to build it in just a moment.",
    note: "Profiling runs locally - personal columns never reach the AI.",
    steps: [
      "Reading file structure...",
      "Detecting column types...",
      "Checking data quality...",
    ],
  },
  generating: {
    eyebrow: "Step 2 of 2 · Building",
    heading: "Building your dashboard",
    blurb:
      "Tada is surfacing the most useful metrics and assembling charts that are ready to explore.",
    note: "This keeps setup fast with no manual chart configuration.",
    steps: [
      "Selecting key metrics...",
      "Choosing chart types...",
      "Composing your dashboard...",
    ],
  },
};

export function ProcessingView({
  phase,
  onComplete,
  isReady,
}: ProcessingViewProps) {
  const content = PHASE_CONTENT[phase];
  const steps = content.steps;
  const reduceMotion = useReducedMotion();

  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepsDone, setStepsDone] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < steps.length - 1) {
          setCompletedSteps((completed) => [...completed, prev]);
          return prev + 1;
        }
        clearInterval(interval);
        setTimeout(() => {
          setCompletedSteps((completed) => [...completed, prev]);
          setStepsDone(true);
        }, 600);
        return prev;
      });
    }, 750);

    return () => clearInterval(interval);
  }, [steps.length]);

  useEffect(() => {
    if (stepsDone && isReady) {
      const timeout = setTimeout(onComplete, 450);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [stepsDone, isReady, onComplete]);

  return (
    <div className="flex h-full flex-col items-center justify-center px-5 py-6">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[24px] border-0 bg-card p-8 shadow-[0_22px_52px_-38px_rgba(25,28,30,0.14)] sm:p-10">
          <div className="inline-flex rounded-full bg-[rgba(0,50,125,0.08)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            {content.eyebrow}
          </div>
          <h2 className="mt-6 font-display text-4xl text-[var(--color-text-primary)] sm:text-5xl">
            {content.heading}
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--color-text-secondary)]">
            {content.blurb}
          </p>

          <Card className="mt-8 rounded-[20px] border-0 bg-[var(--color-surface-muted)] p-5 shadow-none">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-white">
                {phase === "profiling" ? (
                  <ShieldCheck className="h-6 w-6" />
                ) : (
                  <Sparkles className="h-6 w-6" />
                )}
              </div>
              <p className="text-sm text-[var(--color-text-secondary)]">
                {content.note}
              </p>
            </div>
          </Card>
        </Card>

        <Card className="flex flex-col rounded-[24px] border-0 bg-card p-8 shadow-[0_22px_52px_-38px_rgba(25,28,30,0.14)] sm:p-10">
          <div className="mb-8 flex items-center justify-center">
            {phase === "profiling" ? (
              <ScanVisual reduceMotion={Boolean(reduceMotion)} />
            ) : (
              <ChartBuildVisual reduceMotion={Boolean(reduceMotion)} />
            )}
          </div>

          <div className="space-y-3 text-left">
            {steps.map((step, index) => {
              const isActive = index === currentStep && !stepsDone;
              const isDone = completedSteps.includes(index) || stepsDone;
              return (
                <div
                  key={step}
                  className={`flex items-center gap-4 rounded-[20px] px-4 py-3.5 transition-colors duration-300 ${
                    isActive
                      ? "bg-[rgba(0,50,125,0.08)]"
                      : "bg-[var(--color-surface-muted)]"
                  } ${!isActive && !isDone ? "opacity-55" : ""}`}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card">
                    {isDone ? (
                      <Check className="h-4 w-4 text-[var(--color-accent)]" />
                    ) : isActive ? (
                      <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)] motion-reduce:animate-none" />
                    ) : (
                      <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-text-muted)]" />
                    )}
                  </div>
                  <span
                    className={`text-sm ${
                      isActive
                        ? "font-semibold text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

/** Data-themed loader: bars rise and a trend line draws over them, on a loop. */
function ChartBuildVisual({ reduceMotion }: { reduceMotion: boolean }) {
  const bars = useMemo(() => [0.45, 0.7, 0.4, 0.85, 0.6, 0.95], []);
  const width = 260;
  const height = 150;
  const padding = 16;
  const baseline = height - padding;
  const usableW = width - padding * 2;
  const usableH = height - padding * 2;
  const slot = usableW / bars.length;
  const barW = slot * 0.5;

  // Trend line points sit just above each bar top.
  const linePoints = bars.map((value, index) => {
    const x = padding + slot * index + slot / 2;
    const y = baseline - value * usableH;
    return [x, y] as const;
  });
  const linePath = linePoints
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-32 w-full max-w-[300px]"
      role="img"
      aria-label="Building charts"
    >
      <defs>
        <linearGradient id="bar-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.95" />
          <stop
            offset="100%"
            stopColor="var(--color-accent)"
            stopOpacity="0.45"
          />
        </linearGradient>
      </defs>

      {/* baseline */}
      <line
        x1={padding}
        y1={baseline}
        x2={width - padding}
        y2={baseline}
        stroke="var(--color-chart-grid)"
        strokeWidth={1.5}
      />

      {bars.map((value, index) => {
        const x = padding + slot * index + (slot - barW) / 2;
        const barH = value * usableH;
        return (
          <motion.rect
            key={index}
            x={x}
            y={baseline - barH}
            width={barW}
            height={barH}
            rx={4}
            fill="url(#bar-fill)"
            style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
            initial={reduceMotion ? { scaleY: 1 } : { scaleY: 0.08 }}
            animate={reduceMotion ? { scaleY: 1 } : { scaleY: [0.08, 1, 0.08] }}
            transition={
              reduceMotion
                ? undefined
                : {
                    duration: 2.4,
                    ease: "easeInOut",
                    repeat: Infinity,
                    delay: index * 0.12,
                  }
            }
          />
        );
      })}

      <motion.path
        d={linePath}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduceMotion ? { pathLength: 1 } : { pathLength: 0 }}
        animate={reduceMotion ? { pathLength: 1 } : { pathLength: [0, 1, 0] }}
        transition={
          reduceMotion
            ? undefined
            : { duration: 2.4, ease: "easeInOut", repeat: Infinity }
        }
      />

      {linePoints.map(([x, y], index) => (
        <motion.circle
          key={index}
          cx={x}
          cy={y}
          r={3}
          fill="var(--color-accent)"
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={reduceMotion ? { opacity: 1 } : { opacity: [0, 1, 0] }}
          transition={
            reduceMotion
              ? undefined
              : {
                  duration: 2.4,
                  ease: "easeInOut",
                  repeat: Infinity,
                  delay: 0.2 + index * 0.1,
                }
          }
        />
      ))}
    </svg>
  );
}

/** Data-themed loader: a table whose rows are scanned top-to-bottom. */
function ScanVisual({ reduceMotion }: { reduceMotion: boolean }) {
  const rows = [0, 1, 2, 3];
  const cols = [0, 1, 2, 3];
  const width = 260;
  const rowH = 26;
  const gap = 8;
  const padding = 14;
  const height = padding * 2 + rows.length * rowH + (rows.length - 1) * gap;
  const colW = (width - padding * 2 - (cols.length - 1) * gap) / cols.length;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-32 w-full max-w-[300px]"
      role="img"
      aria-label="Scanning dataset"
    >
      {rows.map((row) =>
        cols.map((col) => {
          const x = padding + col * (colW + gap);
          const y = padding + row * (rowH + gap);
          return (
            <motion.rect
              key={`${row}-${col}`}
              x={x}
              y={y}
              width={colW}
              height={rowH}
              rx={6}
              fill="var(--color-surface-muted)"
              stroke="var(--color-chart-grid)"
              strokeWidth={1}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0.5 }}
              animate={reduceMotion ? { opacity: 1 } : { opacity: [0.5, 1, 0.5] }}
              transition={
                reduceMotion
                  ? undefined
                  : {
                      duration: 1.6,
                      ease: "easeInOut",
                      repeat: Infinity,
                      delay: row * 0.18 + col * 0.06,
                    }
              }
            />
          );
        }),
      )}

      {!reduceMotion ? (
        <motion.rect
          x={padding - 4}
          width={width - padding * 2 + 8}
          height={rowH + 4}
          rx={8}
          fill="var(--color-accent)"
          opacity={0.12}
          initial={{ y: padding - 2 }}
          animate={{
            y: [
              padding - 2,
              padding - 2 + (rows.length - 1) * (rowH + gap),
              padding - 2,
            ],
          }}
          transition={{ duration: 2.6, ease: "easeInOut", repeat: Infinity }}
        />
      ) : null}
    </svg>
  );
}
