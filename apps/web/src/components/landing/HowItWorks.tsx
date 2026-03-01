import { Upload, Cpu, LayoutDashboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

const steps = [
  {
    icon: Upload,
    step: "01",
    title: "Upload your data",
    description: "Drag and drop any CSV or Excel file. No formatting required.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "AI does the work",
    description:
      "Our AI instantly understands your data structure and relationships.",
  },
  {
    icon: LayoutDashboard,
    step: "03",
    title: "Explore insights",
    description: "Get a complete dashboard. Ask questions. Discover patterns.",
  },
];

export function HowItWorks() {
  const [visibleItems, setVisibleItems] = useState<number[]>(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return [0, 1, 2];
    }
    return [];
  });
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    if (prefersReducedMotion) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Stagger the animations
            steps.forEach((_, index) => {
              setTimeout(() => {
                setVisibleItems((prev) => [...new Set([...prev, index])]);
              }, index * 150);
            });
          }
        });
      },
      { threshold: 0.2 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="how-it-works"
      className="relative px-4 py-24 sm:px-6"
      ref={sectionRef}
    >
      <div className="container">
        <div className="section-shell px-6 py-10 sm:px-10 sm:py-14">
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

          <div className="relative mt-8">
            {/* Dashed connecting line */}
            <div className="absolute left-[16%] right-[16%] top-6 hidden h-0.5 border-t-2 border-dashed border-primary/20 md:block" />

            <div className="relative grid gap-10 md:grid-cols-3">
              {steps.map((step, index) => (
                <div
                  key={step.step}
                  className={`
                    relative flex flex-col items-center text-center transition-all duration-500 ease-out
                    motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0
                    ${visibleItems.includes(index) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}
                  `}
                  style={{ transitionDelay: `${index * 150}ms` }}
                >
                  <div className="relative z-10 mb-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-xl font-bold text-white shadow-glow ring-8 ring-white">
                    {index + 1}
                  </div>

                  <Card className="surface-panel relative w-full flex-1 rounded-[1.75rem] border border-white/80 p-6 shadow-soft transition-all duration-300 hover:-translate-y-1.5 hover:shadow-card">
                    <div className="mb-5 flex justify-center">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-primary/[0.08]">
                        <step.icon className="h-6 w-6 text-primary" />
                      </div>
                    </div>
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      {step.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {step.description}
                    </p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
