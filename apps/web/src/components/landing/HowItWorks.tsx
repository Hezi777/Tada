import { Upload, Cpu, LayoutDashboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
    description: "Our AI instantly understands your data structure and relationships.",
  },
  {
    icon: LayoutDashboard,
    step: "03",
    title: "Explore insights",
    description: "Get a complete dashboard. Ask questions. Discover patterns.",
  },
];

export function HowItWorks() {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    if (prefersReducedMotion) {
      setVisibleItems([0, 1, 2]);
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
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section id="how-it-works" className="relative px-4 py-24 sm:px-6" ref={sectionRef}>
      <div className="container">
        <div className="section-shell px-6 py-10 sm:px-10 sm:py-14">
          <div className="mb-16 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="eyebrow mb-5">How It Works</div>
              <h2 className="text-4xl text-foreground sm:text-5xl">Three steps to clarity</h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                From messy spreadsheet to actionable dashboard in under a minute.
              </p>
            </div>
            <div className="max-w-sm rounded-[1.5rem] border border-primary/15 bg-primary/[0.07] px-5 py-4 text-sm leading-7 text-foreground shadow-card">
              The experience stays simple on purpose: one upload, one generated dashboard, one conversational loop.
            </div>
          </div>

          <div className="relative grid gap-8 md:grid-cols-3">
            <div className="absolute left-[16%] right-[16%] top-16 hidden h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent md:block" />
            {steps.map((step, index) => (
              <div
                key={step.step}
                className={`
                  relative transition-all duration-500 ease-out
                  motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0
                  ${visibleItems.includes(index) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
                `}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div
                  className="surface-panel group relative z-10 rounded-[1.9rem] border border-white/80 p-7 shadow-card transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-soft focus-within:-translate-y-1.5 focus-within:shadow-soft motion-reduce:hover:translate-y-0 motion-reduce:transition-none"
                  tabIndex={0}
                >
                  <div className="mb-8 flex items-center justify-between">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[1.45rem] border border-white/80 bg-white shadow-card">
                      <step.icon className="h-8 w-8 text-primary transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100" />
                    </div>
                    <div className="text-sm font-semibold uppercase tracking-[0.24em] text-primary/80">{step.step}</div>
                  </div>
                  <h3 className="font-display text-3xl font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
