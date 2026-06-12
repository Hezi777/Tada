"use client";

import { useRef, type ReactNode } from "react";
import { ArrowRight, TrendingUp, Wallet, BarChart3 } from "lucide-react";
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

/** Design canvas for the assembled dashboard (px). Centered + scaled on small screens. */
const FRAME_W = 1000;

type Slot = { l: number; t: number; w: number; h: number };
type Scatter = { x: number; y: number; r: number };

/** One real-looking dashboard tile. Sits at its assembled slot, offset out by scroll. */
function Tile({
  progress,
  slot,
  scatter,
  reduce,
  className,
  children,
}: {
  progress: MotionValue<number>;
  slot: Slot;
  scatter: Scatter;
  reduce: boolean;
  className: string;
  children: ReactNode;
}) {
  const x = useTransform(progress, [0, 1], [scatter.x, 0]);
  const y = useTransform(progress, [0, 1], [scatter.y, 0]);
  const rotate = useTransform(progress, [0, 1], [scatter.r, 0]);
  const scale = useTransform(progress, [0, 1], [0.92, 1]);

  const style = reduce
    ? {}
    : { x, y, rotate, scale };

  return (
    <motion.div
      style={{
        position: "absolute",
        left: slot.l,
        top: slot.t,
        width: slot.w,
        height: slot.h,
        ...style,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function MiniArea() {
  return (
    <svg viewBox="0 0 320 120" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="h-area-s" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#00327d" />
          <stop offset="100%" stopColor="#14b8a6" />
        </linearGradient>
        <linearGradient id="h-area-f" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f6df6" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#2f6df6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d="M0 96 C50 96 60 50 100 56 C150 64 160 22 210 30 C260 38 290 14 320 10 L320 120 L0 120 Z" fill="url(#h-area-f)" />
      <path d="M0 96 C50 96 60 50 100 56 C150 64 160 22 210 30 C260 38 290 14 320 10" fill="none" stroke="url(#h-area-s)" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

function MiniBars() {
  const bars = [42, 60, 34, 72, 50, 64];
  const max = Math.max(...bars);
  return (
    <svg viewBox="0 0 320 120" preserveAspectRatio="none" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id="h-bar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2f6df6" />
          <stop offset="100%" stopColor="#00327d" />
        </linearGradient>
        <linearGradient id="h-bar-hi" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="100%" stopColor="#22c55e" />
        </linearGradient>
      </defs>
      {bars.map((b, i) => {
        const h = (b / 100) * 104;
        const x = 14 + i * 52;
        const hi = b === max;
        return <rect key={i} x={x} y={112 - h} width="34" height={h} rx="7" fill={hi ? "url(#h-bar-hi)" : "url(#h-bar)"} opacity={hi ? 1 : 0.9} />;
      })}
    </svg>
  );
}

function MiniDonut() {
  const r = 34;
  const c = 2 * Math.PI * r;
  const segs = [
    { frac: 0.42, color: "#00327d" },
    { frac: 0.3, color: "#14b8a6" },
    { frac: 0.28, color: "#22c55e" },
  ];
  let off = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="#eef2f7" strokeWidth="13" />
      {segs.map((s, i) => {
        const len = s.frac * c;
        const el = (
          <circle key={i} cx="50" cy="50" r={r} fill="none" stroke={s.color} strokeWidth="13" strokeLinecap="round" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-off} transform="rotate(-90 50 50)" />
        );
        off += len;
        return el;
      })}
    </svg>
  );
}

function KpiTile({
  meshClass,
  label,
  value,
  icon,
  dark,
}: {
  meshClass: string;
  label: string;
  value: string;
  icon: ReactNode;
  dark?: boolean;
}) {
  return (
    <div className={`flex h-full w-full flex-col justify-between rounded-2xl ${meshClass} p-4 shadow-premium`}>
      <div className="flex items-center justify-between">
        <span className={`text-[11px] font-semibold uppercase tracking-wide ${dark ? "text-white/70" : "text-[var(--color-text-secondary)]"}`}>
          {label}
        </span>
        <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${dark ? "bg-white/15 text-white" : "bg-[rgba(0,50,125,0.08)] text-[var(--color-accent)]"}`}>
          {icon}
        </span>
      </div>
      <span className={`display-number text-2xl ${dark ? "text-white" : "text-[var(--color-text-primary)]"}`}>
        {value}
      </span>
    </div>
  );
}

function ChartTile({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-[var(--color-border)] bg-card p-4 shadow-premium">
      <p className="text-xs font-bold text-[var(--color-text-primary)]">{title}</p>
      <div className="mt-2 min-h-0 flex-1">{children}</div>
    </div>
  );
}

export function Hero({ onGetStarted }: HeroProps) {
  const reduce = useReducedMotion() ?? false;
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Frame rises from peeking-at-the-bottom into full view.
  const frameY = useTransform(scrollYProgress, [0, 1], [340, 0]);
  // Empty placeholder slots fade as the real tiles land in them.
  const slotsOpacity = useTransform(scrollYProgress, [0.4, 0.85], [1, 0]);
  // Headline recedes as the dashboard fills.
  const textY = useTransform(scrollYProgress, [0, 1], [0, -150]);
  const textOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.12]);
  const textScale = useTransform(scrollYProgress, [0, 1], [1, 0.86]);

  const rise = (delay: number) => ({
    initial: reduce ? { opacity: 0 } : { y: 30, opacity: 0 },
    animate: reduce ? { opacity: 1 } : { y: 0, opacity: 1 },
    transition: { duration: 0.7, delay, ...easeOut },
  });

  // Assembled slots inside the FRAME_W canvas.
  const pad = 28;
  const kpiW = (FRAME_W - pad * 2 - 3 * 16) / 4;
  const kpiT = 92;
  const kpiH = 104;
  const chartsT = 212;
  const chartsH = 250;
  const slots = {
    k0: { l: pad, t: kpiT, w: kpiW, h: kpiH },
    k1: { l: pad + (kpiW + 16), t: kpiT, w: kpiW, h: kpiH },
    k2: { l: pad + 2 * (kpiW + 16), t: kpiT, w: kpiW, h: kpiH },
    k3: { l: pad + 3 * (kpiW + 16), t: kpiT, w: kpiW, h: kpiH },
    area: { l: pad, t: chartsT, w: 560, h: chartsH },
    bars: { l: pad + 560 + 16, t: chartsT, w: FRAME_W - pad * 2 - 560 - 16, h: 117 },
    donut: { l: pad + 560 + 16, t: chartsT + 133, w: FRAME_W - pad * 2 - 560 - 16, h: 117 },
  };

  return (
    <section ref={sectionRef} className="relative h-[240vh]" aria-label="Tada - turn spreadsheets into dashboards">
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="gradient-glow pointer-events-none absolute inset-0" />
        <div className="editorial-grid pointer-events-none absolute inset-x-8 top-16 bottom-6 opacity-50" />

        {/* Centered hero copy */}
        <motion.div
          style={reduce ? undefined : { y: textY, opacity: textOpacity, scale: textScale }}
          className="absolute inset-x-0 top-[17vh] z-20 flex flex-col items-center px-4 text-center"
        >
          <motion.h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl" {...rise(0.08)}>
            Turn raw spreadsheets into a{" "}
            <span className="text-gradient-brand">clear, living story</span>
          </motion.h1>
          <motion.p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground" {...rise(0.2)}>
            Upload any CSV or Excel file and watch a polished dashboard assemble
            itself - then keep exploring through plain-English questions.
          </motion.p>
          <motion.div className="mt-8 flex flex-col items-center gap-4 sm:flex-row" {...rise(0.32)}>
            <Button variant="hero" size="xl" onClick={onGetStarted}>
              Get started free
              <ArrowRight className="ms-1 h-5 w-5" />
            </Button>
            <Button variant="outline" size="lg" onClick={onGetStarted}>
              Try with sample data
            </Button>
          </motion.div>
        </motion.div>

        {/* Dashboard frame that rises + fills with the scattered tiles */}
        <div className="absolute inset-x-0 top-[42vh] z-10 flex justify-center px-4">
          <motion.div
            style={reduce ? undefined : { y: frameY }}
            className="relative w-[1000px] max-w-full origin-top scale-[0.62] sm:scale-75 lg:scale-100"
          >
            <div className="relative h-[500px] w-full rounded-[28px] border border-[var(--color-border)] bg-card shadow-premium">
              {/* header chrome */}
              <div className="flex items-center justify-between px-7 pt-6">
                <div>
                  <p className="text-lg font-black tracking-tight text-[var(--color-text-primary)]">Sales Overview</p>
                  <p className="text-xs text-[var(--color-text-secondary)]">Generated from your data</p>
                </div>
                <div className="h-8 w-28 rounded-full bg-[var(--color-surface-muted)]" />
              </div>

              {/* empty placeholder slots (fade out as tiles land) */}
              <motion.div style={reduce ? { opacity: 0 } : { opacity: slotsOpacity }}>
                {Object.values(slots).map((s, i) => (
                  <div
                    key={i}
                    style={{ position: "absolute", left: s.l, top: s.t, width: s.w, height: s.h }}
                    className="rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]/40"
                  />
                ))}
              </motion.div>

              {/* real tiles */}
              <Tile progress={scrollYProgress} slot={slots.k0} scatter={{ x: -470, y: -520, r: -10 }} reduce={reduce} className="">
                <KpiTile meshClass="mesh-navy" dark label="Total Sales" value="₪68k" icon={<Wallet className="h-3.5 w-3.5" />} />
              </Tile>
              <Tile progress={scrollYProgress} slot={slots.k1} scatter={{ x: -540, y: -250, r: 7 }} reduce={reduce} className="">
                <KpiTile meshClass="mesh-blue" label="Profit" value="₪12k" icon={<TrendingUp className="h-3.5 w-3.5" />} />
              </Tile>
              <Tile progress={scrollYProgress} slot={slots.k2} scatter={{ x: 540, y: -250, r: -7 }} reduce={reduce} className="">
                <KpiTile meshClass="mesh-teal" label="Avg Order" value="₪1.4k" icon={<BarChart3 className="h-3.5 w-3.5" />} />
              </Tile>
              <Tile progress={scrollYProgress} slot={slots.k3} scatter={{ x: 470, y: -520, r: 10 }} reduce={reduce} className="">
                <KpiTile meshClass="mesh-violet" label="Avg Profit" value="₪257" icon={<TrendingUp className="h-3.5 w-3.5" />} />
              </Tile>
              <Tile progress={scrollYProgress} slot={slots.area} scatter={{ x: -460, y: -90, r: -5 }} reduce={reduce} className="">
                <ChartTile title="Revenue trajectory"><MiniArea /></ChartTile>
              </Tile>
              <Tile progress={scrollYProgress} slot={slots.bars} scatter={{ x: 540, y: -430, r: 8 }} reduce={reduce} className="">
                <ChartTile title="By category"><MiniBars /></ChartTile>
              </Tile>
              <Tile progress={scrollYProgress} slot={slots.donut} scatter={{ x: 520, y: -80, r: -9 }} reduce={reduce} className="">
                <ChartTile title="By region"><MiniDonut /></ChartTile>
              </Tile>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
