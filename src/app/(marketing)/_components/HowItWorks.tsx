"use client";

import { Upload, Cpu, LayoutDashboard, FileSpreadsheet } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload your data",
    description:
      "Drag and drop any CSV or Excel file. No formatting required — Tada profiles the columns for you.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI does the work",
    description:
      "Our AI instantly understands your data structure, relationships and units, then drafts the dashboard.",
  },
  {
    icon: LayoutDashboard,
    step: "03",
    title: "Explore insights",
    description:
      "Get a complete dashboard with KPIs and charts. Ask follow-up questions and watch the view reshape.",
  },
] as const;

const easeOut = { ease: "easeOut" as const };

export function HowItWorks() {
  const shouldReduceMotion = useReducedMotion();

  const reveal = (fromSide: "left" | "right") => ({
    initial: shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, x: fromSide === "left" ? -40 : 40 },
    whileInView: { opacity: 1, x: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: { duration: 0.7, ...easeOut },
  });

  return (
    <section
      id="how-it-works"
      className="relative bg-[var(--color-bg)] px-4 py-24 sm:px-6"
    >
      <div className="container max-w-5xl">
        {/* Heading */}
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <h2 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
            Three steps to clarity
          </h2>
          <p className="mt-5 text-lg leading-8 text-muted-foreground">
            From messy spreadsheet to actionable dashboard in under a minute.
          </p>
        </div>

        {/* Alternating rows with connecting line */}
        <div className="relative flex flex-col gap-16 sm:gap-24">
          {/* Connecting line */}
          <div
            className="absolute left-1/2 top-4 hidden h-[calc(100%-2rem)] w-px -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,hsl(var(--primary)/0.25)_0,hsl(var(--primary)/0.25)_6px,transparent_6px,transparent_12px)] sm:block"
            aria-hidden="true"
          />

          {steps.map((step, index) => {
            const isEven = index % 2 === 1;
            return (
              <div
                key={step.step}
                className="relative grid items-center gap-8 sm:grid-cols-2 sm:gap-12"
              >
                {/* Step marker — center on larger screens */}
                <div className="absolute left-1/2 top-0 hidden -translate-x-1/2 sm:block">
                  <motion.div
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-base font-bold text-white shadow-glow ring-8 ring-[var(--color-bg)]"
                    initial={{ scale: shouldReduceMotion ? 1 : 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      delay: shouldReduceMotion ? 0 : 0.1,
                    }}
                  >
                    {index + 1}
                  </motion.div>
                </div>

                {/* Text block */}
                <motion.div
                  {...reveal(isEven ? "right" : "left")}
                  className={`${isEven ? "sm:order-2 sm:text-left" : "sm:text-right"} flex flex-col items-start sm:items-end ${isEven ? "sm:items-start" : ""}`}
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary/[0.08] sm:hidden">
                    <step.icon className="h-6 w-6 text-primary" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-[0.24em] text-primary/70">
                    Step {step.step}
                  </span>
                  <h3 className="mt-2 font-sans text-2xl font-bold text-foreground sm:text-3xl">
                    {step.title}
                  </h3>
                  <p className="mt-3 max-w-sm text-base leading-7 text-muted-foreground">
                    {step.description}
                  </p>
                </motion.div>

                {/* Visual block */}
                <motion.div
                  {...reveal(isEven ? "left" : "right")}
                  className={`${isEven ? "sm:order-1" : ""} flex ${isEven ? "sm:justify-end" : "sm:justify-start"}`}
                >
                  <div className="relative flex h-40 w-full max-w-sm items-center justify-center overflow-hidden rounded-[20px] border border-white/80 bg-white shadow-soft sm:h-48">
                    <div className="absolute -inset-8 bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary)/0.08),transparent_60%),radial-gradient(circle_at_75%_75%,rgba(34,197,94,0.08),transparent_55%)]" />
                    <div className="relative flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-primary/[0.08]">
                      <step.icon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </div>

        {/* Closing note */}
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ...easeOut }}
          className="mx-auto mt-20 flex max-w-xl items-center gap-3 rounded-full border border-primary/15 bg-primary/[0.05] px-6 py-3 text-center"
        >
          <FileSpreadsheet className="hidden h-4 w-4 shrink-0 text-primary sm:block" />
          <p className="text-sm leading-6 text-foreground">
            One upload, one generated dashboard, one conversational loop — kept
            simple on purpose.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
