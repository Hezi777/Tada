"use client";

import {
  FileSpreadsheet,
  BarChart3,
  MessageSquare,
  Zap,
  ChevronDown,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const easeOut = { ease: "easeOut" as const };

function DashboardGraphic() {
  const bars = [40, 65, 50, 80, 60];
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="mt-6 rounded-[1.5rem] border border-primary/10 bg-white p-5 shadow-soft">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-primary/[0.05] p-3">
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="mt-2 text-lg font-bold text-foreground">$148k</p>
            <p className="mt-1 text-xs font-semibold text-primary">+18%</p>
          </div>
          <div className="rounded-xl bg-primary/[0.05] p-3">
            <p className="text-xs text-muted-foreground">Users</p>
            <p className="mt-2 text-lg font-bold text-foreground">2.4k</p>
          </div>
          <div className="hidden rounded-xl bg-primary/[0.05] p-3 sm:block">
            <p className="text-xs text-muted-foreground">Orders</p>
            <p className="mt-2 text-lg font-bold text-foreground">932</p>
          </div>
          <div className="hidden rounded-xl bg-primary/[0.05] p-3 sm:block">
            <p className="text-xs text-muted-foreground">Churn</p>
            <p className="mt-2 text-lg font-bold text-foreground">1.2%</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-4">
          <div className="flex h-[90px] items-end gap-2">
            {bars.map((height, index) => (
              <motion.div
                key={`${height}-${index}`}
                initial={{ height: shouldReduceMotion ? `${height}%` : 0 }}
                whileInView={{ height: `${height}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1, ...easeOut }}
                className={`w-7 rounded-t-md ${
                  height === 80 ? "bg-primary" : "bg-primary/20"
                }`}
              />
            ))}
          </div>
          <svg
            viewBox="0 0 220 70"
            className="h-16 w-full overflow-visible"
            aria-hidden="true"
          >
            <motion.path
              d="M10 56 C 45 54, 62 36, 92 38 S 144 18, 210 14"
              stroke="hsl(var(--primary) / 0.55)"
              strokeWidth="2"
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
  );
}

function ChatGraphic() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="mt-5 flex flex-col gap-2.5 rounded-[1.25rem] border border-primary/10 bg-white px-4 py-4 shadow-soft">
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1, ...easeOut }}
        className="ms-auto max-w-[12rem] rounded-2xl rounded-tr-sm bg-primary px-3 py-1.5 text-xs text-primary-foreground"
      >
        Show me revenue by region
      </motion.div>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3, ...easeOut }}
        className="max-w-[13rem] rounded-2xl rounded-tl-sm border border-primary/10 bg-white px-3 py-1.5 text-xs text-foreground shadow-sm"
      >
        Here&apos;s your regional breakdown.
      </motion.div>
      <div className="max-w-[6rem] rounded-2xl rounded-tl-sm border border-primary/10 bg-white px-3 py-2.5 shadow-sm">
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
      </div>
    </div>
  );
}

function FileFormatGraphic() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="mt-5 flex items-center justify-center gap-4 rounded-[1.25rem] border border-primary/10 bg-white px-4 py-6 shadow-soft">
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ...easeOut }}
        className="flex h-16 w-14 flex-col items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.05] shadow-sm"
      >
        <FileSpreadsheet className="mb-1.5 h-5 w-5 text-primary" />
        <span className="text-[0.65rem] font-semibold text-primary">CSV</span>
      </motion.div>
      <motion.div
        animate={shouldReduceMotion ? {} : { y: [-4, 4, -4] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        className="text-muted-foreground"
      >
        <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
      </motion.div>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.15, ...easeOut }}
        className="flex h-16 w-14 flex-col items-center justify-center rounded-xl border border-primary/15 bg-primary/[0.05] shadow-sm"
      >
        <FileSpreadsheet className="mb-1.5 h-5 w-5 text-primary" />
        <span className="text-[0.65rem] font-semibold text-primary">XLSX</span>
      </motion.div>
    </div>
  );
}

function InsightsGraphic() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="mt-5 flex flex-col gap-3 rounded-[1.25rem] border border-primary/10 bg-white px-4 py-4 shadow-soft">
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2, ...easeOut }}
        className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/[0.05] px-3 py-2"
      >
        <TrendingUp className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="text-xs font-medium text-primary">Revenue up 18%</span>
      </motion.div>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4, ...easeOut }}
        className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        <span className="text-xs font-medium text-amber-700">
          Anomaly detected
        </span>
      </motion.div>
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
          <div className="eyebrow mb-5">Features</div>
          <h2 className="text-4xl text-foreground sm:text-5xl">
            Zero friction. Pure insight.
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Tada removes everything that stands between you and understanding
            your data.
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Hero feature card — spans 2 cols */}
          <motion.div
            {...reveal(0)}
            className="surface-panel flex flex-col rounded-[20px] border border-white/80 p-6 shadow-soft transition-shadow duration-300 hover:shadow-card sm:p-8 lg:col-span-2"
          >
            <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary/[0.08]">
              <Zap className="h-7 w-7 text-primary" />
            </div>
            <h3 className="mt-5 text-2xl font-bold text-foreground sm:text-3xl">
              Instant dashboards
            </h3>
            <p className="mt-2 max-w-md text-base leading-7 text-muted-foreground">
              AI analyzes your data structure and generates the perfect set of
              charts, KPIs and trends — no setup, no chart-picking.
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
              Ask questions in plain English — &quot;Show me sales by
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
              CSV, Excel, Google Sheets. Just drag and drop — we handle the
              rest.
            </p>
            <FileFormatGraphic />
          </motion.div>

          {/* Small card 2 — spans 2 cols */}
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
              recommendations — surfaced the moment your dashboard is ready.
            </p>
            <InsightsGraphic />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
