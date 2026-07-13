"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";

/**
 * The "magic" placeholder shown in a chart slot while the AI builds a chart.
 * A breathing brand-gradient ring (blue -> teal -> green -> violet) hugs the
 * card edge with a soft halo, an orb breathes inside, and skeleton bars hint
 * at the chart materializing. Reduced-motion users get the static gradient.
 */
export function GeneratingChartCard({
  label = "Generating chart",
}: {
  label?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="relative h-full min-h-[260px] w-full">
      {/* Soft outer halo */}
      <div
        aria-hidden="true"
        className="ai-glow-ring-soft pointer-events-none absolute -inset-2 rounded-[28px] opacity-70 blur-2xl"
      />
      {/* Sharp gradient ring (opaque card on top leaves only the edge showing) */}
      <div
        aria-hidden="true"
        className="ai-glow-ring pointer-events-none absolute -inset-[1.5px] rounded-[21px]"
      />

      <div
        role="status"
        aria-label={`${label}…`}
        className="relative flex h-full min-h-[260px] flex-col items-center justify-center gap-5 overflow-hidden rounded-[20px] bg-card p-6"
      >
        {/* Breathing orb */}
        <motion.div
          aria-hidden="true"
          className="relative flex h-16 w-16 items-center justify-center rounded-full"
          animate={
            reduceMotion ? undefined : { scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }
          }
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="ai-glow-ring-soft absolute inset-0 rounded-full opacity-80 blur-md" />
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-card shadow-premium">
            <Sparkles className="h-5 w-5 text-[var(--color-accent)]" />
          </div>
        </motion.div>

        {/* Skeleton bars, shimmering */}
        <div className="flex h-16 w-full max-w-[220px] items-end justify-center gap-2">
          {[52, 78, 40, 88, 64].map((height, index) => (
            <motion.div
              key={`${height}-${index}`}
              className="w-full rounded-t-md bg-[var(--color-surface-muted)]"
              style={{ height: `${height}%` }}
              animate={reduceMotion ? undefined : { opacity: [0.4, 0.85, 0.4] }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.15,
              }}
            />
          ))}
        </div>

        <p className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)]">
          <span>{label}</span>
          <span className="inline-flex gap-0.5">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                className="inline-block h-1 w-1 rounded-full bg-[var(--color-accent)]"
                animate={reduceMotion ? undefined : { opacity: [0.3, 1, 0.3] }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: dot * 0.2,
                }}
              />
            ))}
          </span>
        </p>
      </div>
    </div>
  );
}
