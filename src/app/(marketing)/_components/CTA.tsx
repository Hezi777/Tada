"use client";

import { ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/shared/ui/button";

interface CTAProps {
  onGetStarted: () => void;
}

const easeOut = { ease: "easeOut" as const };

export function CTA({ onGetStarted }: CTAProps) {
  const shouldReduceMotion = useReducedMotion();
  const rise = (delay: number) => ({
    initial: shouldReduceMotion ? { opacity: 0 } : { y: 40, opacity: 0 },
    whileInView: shouldReduceMotion ? { opacity: 1 } : { y: 0, opacity: 1 },
    viewport: { once: true },
    transition: { duration: 0.7, delay, ...easeOut },
  });

  return (
    <section className="relative px-4 py-24 sm:px-6">
      <div className="container">
        <div className="relative overflow-hidden rounded-[28px] bg-[linear-gradient(135deg,#00327d,#0047ab)] px-6 py-16 text-center sm:px-10 sm:py-24">
          {/* subtle grid + glow texture */}
          <div className="editorial-grid absolute inset-0 opacity-20" />
          <div className="absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center">
            <motion.h2 className="text-4xl text-white sm:text-5xl" {...rise(0)}>
              Ready to understand your data?
            </motion.h2>

            <motion.p
              className="mx-auto mt-5 max-w-xl text-lg leading-8 text-white/80"
              {...rise(0.1)}
            >
              Upload your first file and see Tada in action. It takes 30 seconds
              to go from spreadsheet to insight.
            </motion.p>

            <motion.div
              className="mt-10 flex flex-col justify-center gap-4 sm:flex-row"
              {...rise(0.2)}
            >
              <Button
                size="xl"
                onClick={onGetStarted}
                className="bg-white text-primary hover:bg-white/90"
              >
                Get started free
                <ArrowRight className="ms-1 h-5 w-5" />
              </Button>
              <Button
                variant="outline"
                size="xl"
                onClick={onGetStarted}
                className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              >
                Try with sample data
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
