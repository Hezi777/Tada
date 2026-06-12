"use client";

import { useRef, type ReactNode } from "react";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { Button } from "@/shared/ui/button";

interface HeroProps {
  onGetStarted: () => void;
}

const easeOut = { ease: "easeOut" } as const;

/**
 * A single dashboard fragment. It is laid out at its FINAL (assembled) slot via
 * `className`, then offset/rotated outward by a scroll-driven transform so that
 * at scroll progress 0 it sits scattered across the canvas, and at progress 1 it
 * snaps into place — assembling a clean dashboard as you scroll.
 */
function Fragment({
  progress,
  sx,
  sy,
  sr,
  delayIn,
  className,
  children,
  reduce,
}: {
  progress: MotionValue<number>;
  sx: number;
  sy: number;
  sr: number;
  delayIn: number;
  className: string;
  children: ReactNode;
  reduce: boolean;
}) {
  const x = useTransform(progress, [0, 1], [sx, 0]);
  const y = useTransform(progress, [0, 1], [sy, 0]);
  const rotate = useTransform(progress, [0, 1], [sr, 0]);
  const scale = useTransform(progress, [0, 1], [0.82, 1]);
  const opacity = useTransform(
    progress,
    [0, delayIn, Math.min(delayIn + 0.25, 1)],
    [0, 0, 1],
  );

  if (reduce) {
    return <div className={className}>{children}</div>;
  }
  return (
    <motion.div
      style={{ x, y, rotate, scale, opacity }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function MiniArea() {
  return (
    <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="hero-area-stroke" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00327d" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id="hero-area-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f6df6" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2f6df6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M0 70 C30 70 35 40 60 42 C90 44 95 18 125 24 C155 30 170 12 200 8 L200 90 L0 90 Z"
        fill="url(#hero-area-fill)"
      />
      <path
        d="M0 70 C30 70 35 40 60 42 C90 44 95 18 125 24 C155 30 170 12 200 8"
        fill="none"
        stroke="url(#hero-area-stroke)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MiniBars() {
  const bars = [38, 56, 30, 68, 46];
  const max = Math.max(...bars);
  return (
    <svg viewBox="0 0 200 90" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="hero-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f6df6" />
          <stop offset="100%" stopColor="#00327d" />
        </linearGradient>
        <linearGradient id="hero-bar-hi" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      {bars.map((b, i) => {
        const h = (b / 100) * 78;
        const x = 12 + i * 38;
        const hi = b === max;
        return (
          <rect
            key={i}
            x={x}
            y={84 - h}
            width="22"
            height={h}
            rx="6"
            fill={hi ? "url(#hero-bar-hi)" : "url(#hero-bar)"}
            opacity={hi ? 1 : 0.85}
          />
        );
      })}
    </svg>
  );
}

function MiniDonut() {
  const r = 30;
  const c = 2 * Math.PI * r;
  const segs = [
    { frac: 0.42, color: "#00327d" },
    { frac: 0.3, color: "#14b8a6" },
    { frac: 0.28, color: "#22c55e" },
  ];
  let offset = 0;
  return (
    <svg viewBox="0 0 90 90" className="h-full w-full" aria-hidden>
      <circle cx="45" cy="45" r={r} fill="none" stroke="#eef2f7" strokeWidth="12" />
      {segs.map((s, i) => {
        const len = s.frac * c;
        const el = (
          <circle
            key={i}
            cx="45"
            cy="45"
            r={r}
            fill="none"
            stroke={s.color}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            transform="rotate(-90 45 45)"
          />
        );
        offset += len;
        return el;
      })}
    </svg>
  );
}

export function Hero({ onGetStarted }: HeroProps) {
  const reduce = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // The dashboard frame fades in as the fragments converge.
  const frameOpacity = useTransform(scrollYProgress, [0.15, 0.55], [0, 1]);
  const textShift = useTransform(scrollYProgress, [0, 1], [0, -28]);
  const hintOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  const rise = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { y: 40, opacity: 0 },
    animate: reduce ? { opacity: 1 } : { y: 0, opacity: 1 },
    transition: { duration: 0.8, delay, ...easeOut },
  });

  return (
    <section
      ref={sectionRef}
      className="relative h-[200vh]"
      aria-label="Tada — turn spreadsheets into dashboards"
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden px-4 sm:px-6">
        <div className="gradient-glow pointer-events-none absolute inset-0" />
        <div className="editorial-grid pointer-events-none absolute inset-x-8 top-16 bottom-6 opacity-60" />

        <div className="container relative z-10">
          <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-12">
            {/* Left: copy */}
            <motion.div className="max-w-2xl" style={{ y: reduce ? 0 : textShift }}>
              <motion.div className="eyebrow mb-6" {...rise(0)}>
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[linear-gradient(135deg,#00327d,#22c55e)]">
                  <Sparkles className="h-3 w-3 text-white" />
                </span>
                AI-generated dashboards
              </motion.div>

              <motion.h1
                className="text-5xl font-black leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl"
                {...rise(0.08)}
              >
                Turn raw spreadsheets into a{" "}
                <span className="text-gradient-brand">clear, living story</span>{" "}
                for your team.
              </motion.h1>

              <motion.p
                className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl"
                {...rise(0.2)}
              >
                Upload any CSV or Excel file and watch a polished dashboard
                assemble itself — then keep exploring through plain-English
                questions.
              </motion.p>

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

              {!reduce && (
                <motion.p
                  className="mt-8 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground/70"
                  style={{ opacity: hintOpacity }}
                >
                  Scroll to build the dashboard ↓
                </motion.p>
              )}
            </motion.div>

            {/* Right: scatter → assemble stage */}
            <div className="relative mx-auto hidden h-[460px] w-full max-w-[520px] lg:block">
              {/* assembled frame backdrop */}
              <motion.div
                style={{ opacity: reduce ? 1 : frameOpacity }}
                className="absolute inset-0 rounded-[24px] border border-[var(--color-border)] bg-card/70 shadow-premium backdrop-blur-sm"
              />

              {/* KPI — navy primary */}
              <Fragment
                progress={scrollYProgress}
                sx={-260}
                sy={-150}
                sr={-12}
                delayIn={0.1}
                reduce={reduce}
                className="absolute left-5 top-5 h-[112px] w-[176px] rounded-2xl mesh-navy p-4 text-white shadow-premium"
              >
                <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  Total Sales
                </p>
                <p className="display-number mt-3 text-3xl text-white">₪68k</p>
              </Fragment>

              {/* KPI — teal */}
              <Fragment
                progress={scrollYProgress}
                sx={250}
                sy={-180}
                sr={11}
                delayIn={0.18}
                reduce={reduce}
                className="absolute right-5 top-5 flex h-[112px] w-[176px] flex-col justify-between rounded-2xl mesh-teal p-4 shadow-premium"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                    Growth
                  </p>
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="display-number text-3xl text-[var(--color-text-primary)]">
                  +18%
                </p>
              </Fragment>

              {/* Area chart — wide */}
              <Fragment
                progress={scrollYProgress}
                sx={0}
                sy={220}
                sr={-6}
                delayIn={0.26}
                reduce={reduce}
                className="absolute left-5 right-5 top-[140px] h-[150px] rounded-2xl border border-[var(--color-border)] bg-card p-4 shadow-premium"
              >
                <p className="text-xs font-bold text-[var(--color-text-primary)]">
                  Revenue trajectory
                </p>
                <div className="mt-1 h-[100px]">
                  <MiniArea />
                </div>
              </Fragment>

              {/* Bars */}
              <Fragment
                progress={scrollYProgress}
                sx={-300}
                sy={140}
                sr={14}
                delayIn={0.34}
                reduce={reduce}
                className="absolute bottom-5 left-5 h-[120px] w-[210px] rounded-2xl border border-[var(--color-border)] bg-card p-4 shadow-premium"
              >
                <p className="text-xs font-bold text-[var(--color-text-primary)]">
                  By category
                </p>
                <div className="mt-1 h-[74px]">
                  <MiniBars />
                </div>
              </Fragment>

              {/* Donut */}
              <Fragment
                progress={scrollYProgress}
                sx={300}
                sy={150}
                sr={-12}
                delayIn={0.42}
                reduce={reduce}
                className="absolute bottom-5 right-5 flex h-[120px] w-[140px] flex-col rounded-2xl border border-[var(--color-border)] bg-card p-4 shadow-premium"
              >
                <p className="text-xs font-bold text-[var(--color-text-primary)]">
                  By region
                </p>
                <div className="mx-auto mt-1 h-[74px] w-[74px]">
                  <MiniDonut />
                </div>
              </Fragment>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
