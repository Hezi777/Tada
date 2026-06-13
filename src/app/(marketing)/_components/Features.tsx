"use client";

import {
  FileSpreadsheet,
  BarChart3,
  MessageSquare,
  Zap,
  ChevronDown,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const easeOut = { ease: "easeOut" as const };

function DashboardGraphic() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="relative mt-6 overflow-hidden rounded-[1.5rem] bg-[linear-gradient(150deg,#02297a_0%,#001a48_60%,#001233_100%)] p-5 shadow-premium">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(47,109,246,0.35),transparent_55%),radial-gradient(circle_at_bottom_left,rgba(34,197,94,0.18),transparent_50%)]"
      />
      <div className="relative flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-white/55">
            Overview
          </span>
          <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[0.65rem] font-semibold text-emerald-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
            Live
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.07] p-3">
            <p className="text-xs text-white/60">Revenue</p>
            <p className="display-number mt-2 text-lg text-white">$148k</p>
            <p className="mt-1 text-xs font-semibold text-emerald-300">+18%</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.07] p-3">
            <p className="text-xs text-white/60">Users</p>
            <p className="display-number mt-2 text-lg text-white">2.4k</p>
            <p className="mt-1 text-xs font-semibold text-emerald-300">+6%</p>
          </div>
          <div className="hidden rounded-xl border border-white/10 bg-white/[0.07] p-3 sm:block">
            <p className="text-xs text-white/60">Orders</p>
            <p className="display-number mt-2 text-lg text-white">932</p>
            <p className="mt-1 text-xs font-semibold text-emerald-300">+11%</p>
          </div>
          <div className="hidden rounded-xl border border-white/10 bg-white/[0.07] p-3 sm:block">
            <p className="text-xs text-white/60">Churn</p>
            <p className="display-number mt-2 text-lg text-white">1.2%</p>
            <p className="mt-1 text-xs font-semibold text-rose-300">-0.3%</p>
          </div>
        </div>
        {/* Single trend chart - one clear focal visual */}
        <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-white/80">Revenue trend</p>
            <span className="rounded-full bg-emerald-400/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">
              +18%
            </span>
          </div>
          <div className="relative h-28">
            <svg
              viewBox="0 0 220 80"
              className="absolute inset-0 h-full w-full overflow-visible"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient
                  id="features-area-gradient"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="#2f6df6" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#2f6df6" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[20, 45, 70].map((y) => (
                <line
                  key={y}
                  x1="0"
                  y1={y}
                  x2="220"
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeWidth="1"
                />
              ))}
              <motion.path
                d="M6 62 C 45 60, 62 40, 92 42 S 150 18, 214 12 L 214 80 L 6 80 Z"
                fill="url(#features-area-gradient)"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
              />
              <motion.path
                d="M6 62 C 45 60, 62 40, 92 42 S 150 18, 214 12"
                stroke="#5b9dff"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                initial={{ pathLength: shouldReduceMotion ? 1 : 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{
                  duration: shouldReduceMotion ? 0 : 1.2,
                  ease: "easeOut",
                }}
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatGraphic() {
  const shouldReduceMotion = useReducedMotion();
  const sparkBars = [30, 55, 42, 70, 58, 85, 64];

  return (
    <div className="mt-5 flex flex-1 flex-col gap-4 rounded-[1.25rem] border border-primary/10 bg-white p-5 shadow-soft">
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1, ...easeOut }}
        className="ms-auto max-w-[12rem] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-xs text-primary-foreground"
      >
        Show me revenue by region
      </motion.div>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.35, ...easeOut }}
        className="max-w-[15rem] rounded-2xl rounded-tl-sm border border-primary/10 bg-white p-3.5 shadow-sm"
      >
        <p className="text-xs font-semibold text-foreground">
          West region leads at $52k
        </p>
        <div className="mt-3 flex h-14 items-end gap-1">
          {sparkBars.map((height, index) => (
            <motion.div
              key={`${height}-${index}`}
              initial={{ height: shouldReduceMotion ? `${height}%` : 0 }}
              whileInView={{ height: `${height}%` }}
              viewport={{ once: true }}
              transition={{
                duration: 0.5,
                delay: 0.55 + index * 0.06,
                ...easeOut,
              }}
              className={`flex-1 rounded-[2px] ${
                index === sparkBars.length - 2
                  ? "bg-[linear-gradient(180deg,#14b8a6,#22c55e)]"
                  : "bg-primary/25"
              }`}
            />
          ))}
        </div>
      </motion.div>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.7, ...easeOut }}
        className="ms-auto max-w-[11rem] rounded-2xl rounded-tr-sm bg-primary px-3.5 py-2 text-xs text-primary-foreground"
      >
        And profit margin?
      </motion.div>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.95, ...easeOut }}
        className="max-w-[5.5rem] rounded-2xl rounded-tl-sm border border-primary/10 bg-white px-3 py-2.5 shadow-sm"
      >
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              animate={shouldReduceMotion ? {} : { opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                delay: dot * 0.2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="h-1.5 w-1.5 rounded-full bg-primary/40"
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function FileFormatGraphic() {
  const shouldReduceMotion = useReducedMotion();
  const formats = ["CSV", "XLSX", "Sheets"] as const;

  return (
    <div className="mt-5 flex flex-col items-center gap-4 rounded-[1.25rem] border border-primary/10 bg-white px-4 py-6 shadow-soft">
      <div className="flex items-center justify-center gap-3">
        {formats.map((format, index) => (
          <motion.div
            key={format}
            initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: index * 0.12, ...easeOut }}
            className="flex h-16 w-14 flex-col items-center justify-center gap-1.5 rounded-xl border border-primary/15 bg-primary/[0.05] shadow-sm"
          >
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            <span className="text-[0.62rem] font-semibold text-primary">
              {format}
            </span>
          </motion.div>
        ))}
      </div>
      <motion.div
        animate={shouldReduceMotion ? {} : { y: [-3, 3, -3] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        className="text-muted-foreground"
      >
        <ChevronDown className="h-4 w-4" />
      </motion.div>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.35, ...easeOut }}
        className="flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#00327d,#2f6df6)] px-4 py-1.5 text-xs font-semibold text-white shadow-[0_8px_20px_-10px_rgba(0,50,125,0.6)]"
      >
        <Zap className="h-3.5 w-3.5" />
        Ready to analyze
      </motion.div>
    </div>
  );
}

function InsightsGraphic() {
  const shouldReduceMotion = useReducedMotion();

  const insights = [
    {
      icon: TrendingUp,
      tone: "text-emerald-600",
      bg: "bg-emerald-50",
      ring: "ring-emerald-100",
      label: "Revenue up 18% vs. last month",
      meta: "Trend",
    },
    {
      icon: AlertTriangle,
      tone: "text-amber-600",
      bg: "bg-amber-50",
      ring: "ring-amber-100",
      label: "Unusual spike in EU returns",
      meta: "Anomaly",
    },
    {
      icon: Lightbulb,
      tone: "text-primary",
      bg: "bg-primary/[0.06]",
      ring: "ring-primary/10",
      label: "Focus Q3 spend on the West region",
      meta: "Suggestion",
    },
  ] as const;

  return (
    <div className="mt-5 flex flex-col divide-y divide-black/[0.05] rounded-[1.25rem] border border-primary/10 bg-white px-5 shadow-soft">
      {insights.map((insight, index) => (
        <motion.div
          key={insight.meta}
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.15 + index * 0.12, ...easeOut }}
          className="flex items-center gap-4 py-4"
        >
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ${insight.bg} ${insight.ring}`}
          >
            <insight.icon className={`h-5 w-5 ${insight.tone}`} />
          </span>
          <p className="flex-1 text-sm font-medium text-foreground">
            {insight.label}
          </p>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-wide text-muted-foreground">
            {insight.meta}
          </span>
        </motion.div>
      ))}
    </div>
  );
}

export function Features() {
  const shouldReduceMotion = useReducedMotion();

  const reveal = (delay: number) => ({
    initial: shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.6, delay, ...easeOut },
  });

  return (
    <section
      id="features"
      className="relative bg-[var(--color-surface)] px-4 py-24 sm:px-6"
    >
      <div className="container">
        {/* Heading */}
        <div className="mb-14 max-w-2xl">
          <h2 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
            Zero friction. Pure insight.
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Tada removes everything that stands between you and understanding
            your data.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Hero feature card - spans 2 cols */}
          <motion.div
            {...reveal(0)}
            className="surface-panel flex flex-col rounded-[20px] border border-white/80 p-6 shadow-soft transition-shadow duration-300 hover:shadow-card sm:p-8 lg:col-span-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[linear-gradient(135deg,#00327d,#2f6df6)] shadow-[0_8px_24px_-8px_rgba(0,50,125,0.5)]">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-foreground sm:text-3xl">
              Instant dashboards
            </h3>
            <p className="mt-2 max-w-md text-base leading-7 text-muted-foreground">
              AI analyzes your data structure and generates the perfect set of
              charts, KPIs and trends - no setup, no chart-picking.
            </p>
            <DashboardGraphic />
          </motion.div>

          {/* Tall side card */}
          <motion.div
            {...reveal(0.1)}
            className="surface-panel flex flex-col rounded-[20px] border border-white/80 p-6 shadow-soft transition-shadow duration-300 hover:shadow-card sm:p-8"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary/[0.08]">
              <MessageSquare className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-foreground">
              Chat with your data
            </h3>
            <p className="mt-2 text-base leading-7 text-muted-foreground">
              Ask questions in plain English - &quot;Show me sales by
              region&quot; just works.
            </p>
            <ChatGraphic />
          </motion.div>

          {/* Small card 1 */}
          <motion.div
            {...reveal(0.18)}
            className="surface-panel flex flex-col rounded-[20px] border border-white/80 p-6 shadow-soft transition-shadow duration-300 hover:shadow-card sm:p-8"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary/[0.08]">
              <FileSpreadsheet className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-foreground">
              Any file format
            </h3>
            <p className="mt-2 text-base leading-7 text-muted-foreground">
              CSV, Excel, Google Sheets. Just drag and drop - we handle the
              rest.
            </p>
            <FileFormatGraphic />
          </motion.div>

          {/* Small card 2 - spans 2 cols */}
          <motion.div
            {...reveal(0.26)}
            className="surface-panel flex flex-col rounded-[20px] border border-white/80 p-6 shadow-soft transition-shadow duration-300 hover:shadow-card sm:p-8 lg:col-span-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary/[0.08]">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-foreground">
              Smart insights
            </h3>
            <p className="mt-2 max-w-md text-base leading-7 text-muted-foreground">
              Automatic trend detection, anomaly alerts, and actionable
              recommendations - surfaced the moment your dashboard is ready.
            </p>
            <InsightsGraphic />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
