'use client';

import { motion } from 'framer-motion';
import { Button } from '@/shared/ui/button';

interface CTAProps {
  onGetStarted: () => void;
}

const easeOut = { ease: 'easeOut' as const };

export function CTA({ onGetStarted }: CTAProps) {
  return (
    <section className="relative overflow-hidden bg-white py-32">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_#EFF6FF_0%,_transparent_70%)]" />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 text-center">
        <motion.h2
          className="text-center text-5xl font-bold tracking-tight text-slate-900 md:text-6xl"
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ...easeOut }}
        >
          Ready to understand your data?
        </motion.h2>

        <motion.p
          className="mx-auto mt-6 max-w-xl text-center text-lg text-slate-500"
          initial={{ y: 40, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.1, ...easeOut }}
        >
          Upload your first file and see Tada in action. It takes 30 seconds to
          go from spreadsheet to insight.
        </motion.p>

        <motion.div
          className="mt-12 flex flex-col justify-center gap-4 sm:flex-row"
          initial={{ y: 20, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2, ...easeOut }}
        >
          <Button
            onClick={onGetStarted}
            className="rounded-xl bg-slate-900 px-8 py-6 text-base font-semibold text-white hover:bg-slate-800"
          >
            Get started
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-slate-300 px-8 py-6 text-base font-semibold text-slate-700"
          >
            Schedule a call
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
