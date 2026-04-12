'use client';

import { useRef } from 'react';
import {
  FileSpreadsheet,
  BarChart3,
  MessageSquare,
  Zap,
  ChevronDown,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';

const features = [
  {
    icon: FileSpreadsheet,
    title: 'Any file format',
    description:
      'CSV, Excel, Google Sheets. Just drag and drop — we handle the rest.',
  },
  {
    icon: Zap,
    title: 'Instant dashboards',
    description:
      'AI analyzes your data structure and generates the perfect visualization.',
  },
  {
    icon: MessageSquare,
    title: 'Chat with your data',
    description:
      'Ask questions in plain English. "Show me sales by region" just works.',
  },
  {
    icon: BarChart3,
    title: 'Smart insights',
    description:
      'Automatic trend detection, anomaly alerts, and actionable recommendations.',
  },
];

const TOTAL = features.length; // 4
const ENTRY_POINTS = [0, 0.25, 0.5, 0.75];
const ENTRY_RANGE = 0.08; // opacity+y animate over this progress slice

function useCardMotion(scrollYProgress: MotionValue<number>, index: number) {
  const entry = ENTRY_POINTS[index];
  const stackOffset = index * 20;

  // --- Incoming animation (opacity + y) ---
  const opacity = useTransform(
    scrollYProgress,
    index === 0
      ? [0, 0.001] // card 0 is visible immediately
      : [entry, entry + ENTRY_RANGE],
    [index === 0 ? 1 : 0, 1],
  );

  const entranceY = useTransform(
    scrollYProgress,
    index === 0 ? [0, 0.001] : [entry, entry + ENTRY_RANGE],
    [index === 0 ? 0 : 60, 0],
  );
  const y = useTransform(entranceY, (value) => value + stackOffset);

  // --- Scale: shrinks as subsequent cards arrive ---
  // Build input/output arrays: for each later card j, when j enters
  // card i loses 0.02 scale.
  const scaleInputs: number[] = [0];
  const scaleOutputs: number[] = [1];

  for (let j = index + 1; j < TOTAL; j++) {
    const jEntry = ENTRY_POINTS[j];
    // Right before card j enters, still at previous scale
    scaleInputs.push(jEntry);
    scaleOutputs.push(scaleOutputs[scaleOutputs.length - 1]);
    // After card j finishes entering, drop by 0.02
    scaleInputs.push(jEntry + ENTRY_RANGE);
    scaleOutputs.push(scaleOutputs[scaleOutputs.length - 1] - 0.02);
  }
  // Hold final value to end
  scaleInputs.push(1);
  scaleOutputs.push(scaleOutputs[scaleOutputs.length - 1]);

  const scale = useTransform(scrollYProgress, scaleInputs, scaleOutputs);

  return { opacity, y, scale };
}

function FeatureCard({
  feature,
  index,
  scrollYProgress,
}: {
  feature: (typeof features)[number];
  index: number;
  scrollYProgress: MotionValue<number>;
}) {
  const { opacity, y, scale } = useCardMotion(scrollYProgress, index);

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      style={{ opacity, y, scale, zIndex: index * 10 }}
    >
      <div
        className="relative flex min-h-[620px] w-full max-w-6xl gap-12 overflow-hidden rounded-[2rem] bg-[#F1F5F9] p-16 shadow-md"
      >
        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br from-white/40 to-transparent" />
        {/* Left — content */}
        <div className="relative flex flex-1 flex-col justify-center gap-5">
          <div className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-slate-100 bg-white shadow-sm">
            <feature.icon className="h-10 w-10 text-blue-600" />
          </div>
          <h3 className="text-3xl font-bold text-slate-900">
            {feature.title}
          </h3>
          <p className="max-w-sm text-base leading-8 text-slate-500">
            {feature.description}
          </p>
        </div>

        {/* Right — illustration placeholder */}
        {index === 0 ? (
          <FileFormatGraphic />
        ) : index === 1 ? (
          <DashboardGraphic />
        ) : index === 2 ? (
          <ChatGraphic />
        ) : index === 3 ? (
          <InsightsGraphic />
        ) : (
          <div className="hidden min-h-[440px] flex-1 rounded-[1.75rem] border border-slate-100/80 bg-white bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:20px_20px] shadow-sm md:block" />
        )}
      </div>
    </motion.div>
  );
}

function FileFormatGraphic() {
  return (
    <div className="hidden min-h-[440px] flex-1 rounded-[1.75rem] border border-slate-100/80 bg-white bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:20px_20px] shadow-sm md:block">
      <div className="flex h-full flex-col items-center justify-center gap-6">
        <div className="flex items-center justify-center gap-6">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex h-28 w-24 flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm"
          >
            <FileSpreadsheet className="mb-3 h-7 w-7 text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-600">CSV</span>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: 'easeOut' }}
            className="flex h-28 w-24 flex-col items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 shadow-sm"
          >
            <FileSpreadsheet className="mb-3 h-7 w-7 text-blue-500" />
            <span className="text-xs font-semibold text-blue-600">XLSX</span>
          </motion.div>
        </div>
        <motion.div
          animate={{ y: [-6, 6, -6] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          className="flex items-center justify-center text-slate-400"
        >
          <ChevronDown className="h-6 w-6" />
        </motion.div>
        <div className="h-16 w-32 rounded-xl border border-slate-200 bg-slate-100" />
      </div>
    </div>
  );
}

function DashboardGraphic() {
  const bars = [40, 65, 50, 80, 60];

  return (
    <div className="hidden min-h-[440px] flex-1 rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:block">
      <div className="flex h-full flex-col gap-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-400">Revenue</p>
            <p className="mt-2 text-lg font-bold text-slate-900">$148k</p>
            <p className="mt-1 text-xs text-emerald-500">+18%</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs text-slate-400">Users</p>
            <p className="mt-2 text-lg font-bold text-slate-900">2.4k</p>
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-end gap-5">
          <div className="flex h-[120px] items-end gap-2">
            {bars.map((height, index) => (
              <motion.div
                key={`${height}-${index}`}
                initial={{ height: 0 }}
                animate={{ height: `${height}%` }}
                transition={{
                  duration: 0.6,
                  delay: index * 0.1,
                  ease: 'easeOut',
                }}
                className={`w-8 rounded-t-md ${
                  height === 80 ? 'bg-blue-500' : 'bg-blue-200'
                }`}
              />
            ))}
          </div>
          <svg
            viewBox="0 0 220 70"
            className="h-20 w-full overflow-visible"
            aria-hidden="true"
          >
            <motion.path
              d="M10 56 C 45 54, 62 36, 92 38 S 144 18, 210 14"
              stroke="#60A5FA"
              strokeWidth="2"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ChatGraphic() {
  return (
    <div className="hidden min-h-[440px] flex-1 flex-col justify-center gap-4 px-8 md:flex">
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
        className="ml-auto rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2 text-sm text-white"
      >
        Show me revenue by region
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.6, ease: 'easeOut' }}
        className="max-w-[18rem] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm"
      >
        Here&apos;s your regional breakdown 📊
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 1, ease: 'easeOut' }}
        className="ml-auto rounded-2xl rounded-tr-sm bg-blue-600 px-4 py-2 text-sm text-white"
      >
        Filter to Q4 only
      </motion.div>
      <div className="max-w-[10rem] rounded-2xl rounded-tl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((dot) => (
            <motion.span
              key={dot}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 1,
                delay: dot * 0.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="h-1.5 w-1.5 rounded-full bg-slate-400"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function InsightsGraphic() {
  return (
    <div className="hidden min-h-[440px] flex-1 flex-col justify-center gap-6 rounded-[1.75rem] border border-slate-100/80 bg-white bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:20px_20px] px-8 shadow-sm md:flex">
      <svg viewBox="0 0 300 120" className="h-[120px] w-full" aria-hidden="true">
        <defs>
          <linearGradient id="fadeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M 0 100 C 60 90, 100 70, 150 55 S 240 20, 300 10 L 300 120 L 0 120 Z"
          fill="url(#fadeGrad)"
        />
        <motion.path
          d="M 0 100 C 60 90, 100 70, 150 55 S 240 20, 300 10"
          stroke="#3b82f6"
          strokeWidth="2.5"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
        <motion.circle
          cx="300"
          cy="10"
          r="5"
          fill="#3b82f6"
          animate={{ scale: [1, 1.8, 1] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
        />
      </svg>
      <div className="flex gap-3">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.2, ease: 'easeOut' }}
          className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2"
        >
          <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-medium text-emerald-700">
            Revenue up 18%
          </span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.4, ease: 'easeOut' }}
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

export function Features() {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative min-h-[500vh] px-6 py-24"
    >
      {/* Heading — normal flow, scrolls away */}
      <div className="mx-auto mb-20 max-w-4xl">
        <h2 className="text-5xl font-bold tracking-tight text-slate-900 md:text-6xl">
          Zero friction. Pure insight.
        </h2>
        <p className="mt-4 max-w-2xl text-lg text-slate-500">
          Tada removes everything that stands between you and understanding your
          data.
        </p>
      </div>

      {/* Sticky container: pins for the entire scroll range */}
      <div className="sticky top-24 flex h-[calc(100vh-6rem)] items-center justify-center">
        <div className="relative h-full w-full">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              feature={feature}
              index={index}
              scrollYProgress={scrollYProgress}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
