"use client";

import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/shared/ui/button";

interface CTAProps {
  onGetStarted: () => void;
}

const easeOut = { ease: "easeOut" as const };

export function CTA({ onGetStarted }: CTAProps) {
  return (
    <section className="relative px-4 py-24 sm:px-6">
      <div className="container">
        <div className="section-shell relative overflow-hidden px-6 py-16 text-center sm:px-10 sm:py-20">
          <div className="absolute inset-0 gradient-glow pointer-events-none" />

          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center">
            <motion.h2
              className="text-4xl text-foreground sm:text-5xl"
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, ...easeOut }}
            >
              Ready to understand your data?
            </motion.h2>

            <motion.p
              className="mx-auto mt-5 max-w-xl text-lg leading-8 text-muted-foreground"
              initial={{ y: 40, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.1, ...easeOut }}
            >
              Upload your first file and see Tada in action. It takes 30 seconds
              to go from spreadsheet to insight.
            </motion.p>

            <motion.div
              className="mt-10 flex flex-col justify-center gap-4 sm:flex-row"
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.2, ...easeOut }}
            >
              <Button variant="hero" size="xl" onClick={onGetStarted}>
                Get started free
                <ArrowRight className="ms-1 h-5 w-5" />
              </Button>
              <Button variant="outline" size="xl" onClick={onGetStarted}>
                Try with sample data
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
