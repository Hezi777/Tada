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
    <section id="how-it-works" className="py-24 bg-surface relative" ref={sectionRef}>
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Three steps to clarity
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From messy spreadsheet to actionable dashboard in under a minute.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-12 left-1/6 right-1/6 h-0.5 bg-border" />
            
            {steps.map((step, index) => (
              <div 
                key={step.step} 
                className={`
                  relative text-center transition-all duration-500 ease-out
                  motion-reduce:transition-none motion-reduce:opacity-100 motion-reduce:translate-y-0
                  ${visibleItems.includes(index) 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8'
                  }
                `}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div 
                  className="group inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-card border border-border shadow-card mb-6 relative z-10 transition-all duration-300 ease-out hover:shadow-soft hover:border-primary/30 hover:-translate-y-1 hover:scale-105 focus-within:shadow-soft focus-within:border-primary/30 motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 motion-reduce:transition-none"
                  tabIndex={0}
                >
                  <step.icon className="h-10 w-10 text-primary transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100" />
                </div>
                <div className="text-xs font-semibold text-primary mb-2">{step.step}</div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
