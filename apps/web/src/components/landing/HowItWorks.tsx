'use client';

import { useRef } from 'react';
import { Upload, Cpu, LayoutDashboard } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Card } from '@/components/ui/card';

const steps = [
  {
    icon: Upload,
    step: '01',
    title: 'Upload your data',
    description: 'Drag and drop any CSV or Excel file. No formatting required.',
  },
  {
    icon: Cpu,
    step: '02',
    title: 'AI does the work',
    description:
      'Our AI instantly understands your data structure and relationships.',
  },
  {
    icon: LayoutDashboard,
    step: '03',
    title: 'Explore insights',
    description: 'Get a complete dashboard. Ask questions. Discover patterns.',
  },
];

const easeOut = { ease: 'easeOut' as const };

function AnimatedConnector() {
  const ref = useRef<SVGSVGElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'start 0.35'],
  });
  const pathLength = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <svg
      ref={ref}
      className="absolute left-[16%] right-[16%] top-6 hidden w-[68%] md:block"
      style={{ height: '2px', overflow: 'visible' }}
      aria-hidden="true"
    >
      {/* track */}
      <line
        x1="0"
        y1="1"
        x2="100%"
        y2="1"
        stroke="hsl(var(--primary) / 0.12)"
        strokeWidth="2"
        strokeDasharray="6 6"
      />
      {/* animated fill */}
      <motion.line
        x1="0"
        y1="1"
        x2="100%"
        y2="1"
        stroke="hsl(var(--primary) / 0.55)"
        strokeWidth="2"
        strokeDasharray="6 6"
        style={{ pathLength }}
      />
    </svg>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative px-4 py-24 sm:px-6">
      <div className="container">
        <div className="section-shell px-6 py-10 sm:px-10 sm:py-14">
          {/* Heading row */}
          <div className="mb-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="eyebrow mb-5">How It Works</div>
              <h2 className="text-4xl text-foreground sm:text-5xl">
                Three steps to clarity
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                From messy spreadsheet to actionable dashboard in under a
                minute.
              </p>
            </div>
            <Card className="max-w-sm rounded-[1.5rem] border border-primary/15 bg-primary/[0.07] px-5 py-4 text-sm leading-7 text-foreground shadow-card">
              The experience stays simple on purpose: one upload, one generated
              dashboard, one conversational loop.
            </Card>
          </div>

          {/* Card stack */}
          <div className="relative mt-8">
            {/* Animated SVG connector line */}
            <AnimatedConnector />

            <div className="relative grid gap-10 md:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={step.step}
                  className="relative flex flex-col items-center text-center"
                >
                  {/* Numbered circle — spring scale-in */}
                  <motion.div
                    className="relative z-10 mb-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-glow ring-8 ring-white"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      delay: index * 0.15,
                    }}
                  >
                    {index + 1}
                  </motion.div>

                  {/* Card — y fade-in */}
                  <motion.div
                    className="w-full flex-1"
                    initial={{ y: 40, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    viewport={{ once: true, margin: '-100px' }}
                    transition={{
                      duration: 0.6,
                      delay: index * 0.15,
                      ...easeOut,
                    }}
                  >
                    <Card className="surface-panel relative w-full rounded-[1.75rem] border border-white/80 p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card">
                      <div className="mb-5 flex justify-center">
                        <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary/[0.08]">
                          <step.icon className="h-6 w-6 text-primary" />
                        </div>
                      </div>
                      <h3 className="font-sans text-2xl font-bold text-foreground">
                        {step.title}
                      </h3>
                      <p className="mt-3 text-sm leading-7 text-muted-foreground">
                        {step.description}
                      </p>
                    </Card>
                  </motion.div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
