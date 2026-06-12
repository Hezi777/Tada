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

const features = [
  {
    icon: FileSpreadsheet,
    title: "Any file format",
    description:
      "CSV, Excel, Google Sheets. Just drag and drop — we handle the rest.",
    graphic: "file-format",
  },
  {
    icon: Zap,
    title: "Instant dashboards",
    description:
      "AI analyzes your data structure and generates the perfect visualization.",
    graphic: "dashboard",
  },
  {
    icon: MessageSquare,
    title: "Chat with your data",
    description:
      'Ask questions in plain English. "Show me sales by region" just works.',
    graphic: "chat",
  },
  {
    icon: BarChart3,
    title: "Smart insights",
    description:
      "Automatic trend detection, anomaly alerts, and actionable recommendations.",
    graphic: "insights",
  },
] as const;

function FileFormatGraphic() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="hidden min-h-[220px] flex-1 rounded-[1.75rem] border border-primary/10 bg-white shadow-soft md:block">
      <div className="flex h-full flex-col items-center justify-center gap-5 p-6">
        <div className="flex items-center justify-center gap-6">
          <motion.div
            initial={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -20 }
            }
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ...easeOut }}
            className="flex h-24 w-20 flex-col items-center justify-center rounded-2xl border border-primary/15 bg-primary/[0.05] shadow-sm"
          >
            <FileSpreadsheet className="mb-2 h-6 w-6 text-primary" />
            <span className="text-xs font-semibold text-primary">CSV</span>
          </motion.div>
          <motion.div
            initial={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: -20 }
            }
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.15, ...easeOut }}
            className="flex h-24 w-20 flex-col items-center justify-center rounded-2xl border border-primary/15 bg-primary/[0.05] shadow-sm"
          >
            <FileSpreadsheet className="mb-2 h-6 w-6 text-primary" />
            <span className="text-xs font-semibold text-primary">XLSX</span>
          </motion.div>
        </div>
        <motion.div
          animate={shouldReduceMotion ? {} : { y: [-6, 6, -6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          className="flex items-center justify-center text-muted-foreground"
        >
          <ChevronDown className="h-5 w-5" />
        </motion.div>
        <div className="h-12 w-28 rounded-xl bg-primary/[0.07]" />
      </div>
    </div>
  );
}

function DashboardGraphic() {
  const bars = [40, 65, 50, 80, 60];
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="hidden min-h-[220px] flex-1 rounded-[1.75rem] border border-primary/10 bg-white p-5 shadow-soft md:block">
      <div className="flex h-full flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-primary/[0.05] p-3">
            <p className="text-xs text-muted-foreground">Revenue</p>
            <p className="mt-2 text-lg font-bold text-foreground">$148k</p>
            <p className="mt-1 text-xs font-semibold text-primary">+18%</p>
          </div>
          <div className="rounded-xl bg-primary/[0.05] p-3">
            <p className="text-xs text-muted-foreground">Users</p>
            <p className="mt-2 text-lg font-bold text-foreground">2.4k</p>
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
    <div className="hidden min-h-[220px] flex-1 flex-col justify-center gap-3 rounded-[1.75rem] border border-primary/10 bg-white px-6 py-6 shadow-soft md:flex">
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.1, ...easeOut }}
        className="ms-auto rounded-2xl rounded-tr-sm bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        Show me revenue by region
      </motion.div>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3, ...easeOut }}
        className="max-w-[18rem] rounded-2xl rounded-tl-sm border border-primary/10 bg-white px-4 py-2 text-sm text-foreground shadow-sm"
      >
        Here&apos;s your regional breakdown.
      </motion.div>
      <motion.div
        initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, x: 20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.5, ...easeOut }}
        className="ms-auto rounded-2xl rounded-tr-sm bg-primary px-4 py-2 text-sm text-primary-foreground"
      >
        Filter to Q4 only
      </motion.div>
      <div className="max-w-[10rem] rounded-2xl rounded-tl-sm border border-primary/10 bg-white px-4 py-3 shadow-sm">
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

function InsightsGraphic() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className="hidden min-h-[220px] flex-1 flex-col justify-center gap-5 rounded-[1.75rem] border border-primary/10 bg-white px-6 py-6 shadow-soft md:flex">
      <svg
        viewBox="0 0 300 120"
        className="h-[100px] w-full"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="fadeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor="hsl(var(--primary))"
              stopOpacity="0.18"
            />
            <stop
              offset="100%"
              stopColor="hsl(var(--primary))"
              stopOpacity="0"
            />
          </linearGradient>
        </defs>
        <path
          d="M 0 100 C 60 90, 100 70, 150 55 S 240 20, 300 10 L 300 120 L 0 120 Z"
          fill="url(#fadeGrad)"
        />
        <motion.path
          d="M 0 100 C 60 90, 100 70, 150 55 S 240 20, 300 10"
          stroke="hsl(var(--primary))"
          strokeWidth="2.5"
          fill="none"
          initial={{ pathLength: shouldReduceMotion ? 1 : 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: shouldReduceMotion ? 0 : 1.5,
            ease: "easeInOut",
          }}
        />
        <motion.circle
          cx="300"
          cy="10"
          r="5"
          fill="hsl(var(--primary))"
          animate={shouldReduceMotion ? {} : { scale: [1, 1.8, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformBox: "fill-box", transformOrigin: "center" }}
        />
      </svg>
      <div className="flex flex-wrap gap-3">
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2, ...easeOut }}
          className="flex items-center gap-2 rounded-xl border border-primary/15 bg-primary/[0.05] px-3 py-2"
        >
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">
            Revenue up 18%
          </span>
        </motion.div>
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4, ...easeOut }}
          className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2"
        >
          <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs font-medium text-amber-700">
            Anomaly detected
          </span>
        </motion.div>
      </div>
    </div>
  );
}

function FeatureGraphic({
  kind,
}: {
  kind: (typeof features)[number]["graphic"];
}) {
  switch (kind) {
    case "file-format":
      return <FileFormatGraphic />;
    case "dashboard":
      return <DashboardGraphic />;
    case "chat":
      return <ChatGraphic />;
    case "insights":
      return <InsightsGraphic />;
    default:
      return null;
  }
}

export function Features() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="features" className="relative px-4 py-24 sm:px-6">
      <div className="container">
        {/* Heading */}
        <div className="mx-auto mb-14 max-w-3xl text-center">
          <div className="eyebrow mb-5">Features</div>
          <h2 className="text-4xl text-foreground sm:text-5xl">
            Zero friction. Pure insight.
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            Tada removes everything that stands between you and understanding
            your data.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={
                shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 40 }
              }
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, delay: index * 0.1, ...easeOut }}
              className="surface-panel flex flex-col gap-5 rounded-[1.75rem] border border-white/80 p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card sm:p-8"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-primary/[0.08]">
                <feature.icon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 max-w-md text-base leading-7 text-muted-foreground">
                  {feature.description}
                </p>
              </div>
              <FeatureGraphic kind={feature.graphic} />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
