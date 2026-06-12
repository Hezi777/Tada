"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const faqs = [
  {
    question: "What file formats does Tada support?",
    answer:
      "Tada currently supports CSV and Excel (.xlsx, .xls) files. Just drag and drop your file, and we'll automatically parse the structure, detect columns, and prepare it for instant visualization.",
  },
  {
    question: "Is my data private and secure?",
    answer:
      "Absolutely. We rely on enterprise-grade infrastructure. Your uploaded datasets are stored securely and never used to train global AI models without your explicit consent.",
  },
  {
    question: "How long does it take to generate a dashboard?",
    answer:
      "Usually less than 30 seconds. Once your file is uploaded, our AI agents analyze the schema and instantly generate a suite of optimal charts and insights without any manual configuration.",
  },
  {
    question: "Can I ask questions about my data?",
    answer:
      "Yes! Every generated dashboard includes an AI copilot. You can ask complex analytical questions in plain English (e.g., 'Show me sales by region for the last 30 days'), and Tada will instantly draw the chart for you.",
  },
  {
    question: "Is it really free?",
    answer:
      "Tada is currently in beta and completely free to use. We want to hear your feedback to help shape the future of instant data insights.",
  },
];

const easeOut = { ease: "easeOut" as const };

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const shouldReduceMotion = useReducedMotion();

  return (
    <section className="relative bg-[var(--color-accent-light)] px-4 py-24 sm:px-6">
      <div className="container">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          {/* Left: heading */}
          <motion.div
            initial={
              shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }
            }
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.6, ...easeOut }}
            className="lg:sticky lg:top-32 lg:self-start"
          >
            <div className="eyebrow mb-5">
              <span className="h-1.5 w-1.5 rounded-full bg-[linear-gradient(135deg,#00327d,#22c55e)]" />
              FAQ
            </div>
            <h2 className="text-4xl text-foreground sm:text-5xl">
              Common questions
            </h2>
            <p className="mt-5 max-w-md text-lg leading-8 text-muted-foreground">
              Everything you need to know before you upload your first file.
              Can&apos;t find what you&apos;re looking for? Reach out anytime.
            </p>
          </motion.div>

          {/* Right: accordion */}
          <div className="flex flex-col gap-4">
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <motion.div
                  key={index}
                  initial={
                    shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }
                  }
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className={`rounded-[20px] border transition-all duration-300 ${
                    isOpen
                      ? "border-primary/20 bg-white shadow-md"
                      : "border-white/80 bg-white/70 hover:bg-white hover:shadow-sm"
                  }`}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : index)}
                    className="flex w-full items-center justify-between p-6 text-left outline-none"
                  >
                    <span
                      className={`font-sans text-lg font-semibold transition-colors ${isOpen ? "text-primary" : "text-foreground"}`}
                    >
                      {faq.question}
                    </span>
                    <div
                      className={`ms-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${isOpen ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                    >
                      <ChevronDown
                        className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="answer"
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        style={{ overflow: "hidden" }}
                      >
                        <p className="px-6 pb-6 leading-relaxed text-muted-foreground">
                          {faq.answer}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
