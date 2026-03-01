import { useEffect, useState } from "react";
import { Check, Lightbulb, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ProcessingViewProps {
  onComplete: () => void;
  isReady: boolean;
}

const processingSteps = [
  "Reading file structure...",
  "Analyzing column types...",
  "Detecting relationships...",
  "Identifying key metrics...",
  "Generating visualizations...",
  "Building your dashboard...",
];

export function ProcessingView({ onComplete, isReady }: ProcessingViewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [stepsDone, setStepsDone] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < processingSteps.length - 1) {
          setCompletedSteps((completed) => [...completed, prev]);
          return prev + 1;
        }

        clearInterval(interval);
        setTimeout(() => {
          setCompletedSteps((completed) => [...completed, prev]);
          setStepsDone(true);
        }, 800);
        return prev;
      });
    }, 700);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (stepsDone && isReady) {
      const timeout = setTimeout(onComplete, 500);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [stepsDone, isReady, onComplete]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 gradient-glow" />
      <div className="pointer-events-none absolute inset-x-8 top-12 bottom-12 editorial-grid opacity-60" />

      <div className="container relative">
        <div className="mx-auto max-w-5xl section-shell p-5 sm:p-7">
          <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1fr]">
            <Card className="rounded-[2rem] border border-white/80 bg-white/80 p-8 shadow-card">
              <div className="eyebrow mb-6">Generating Dashboard</div>
              <h2 className="text-4xl text-foreground sm:text-5xl">
                Analyzing your data
              </h2>
              <p className="mt-5 text-lg leading-8 text-muted-foreground">
                Tada is learning your dataset&apos;s structure, surfacing useful
                metrics, and assembling a dashboard that&apos;s ready to
                explore.
              </p>

              <Card className="mt-8 rounded-[1.6rem] border border-primary/15 bg-primary/[0.07] p-5 shadow-card">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] gradient-primary shadow-glow">
                    <Lightbulb className="h-6 w-6 text-primary-foreground animate-pulse-soft motion-reduce:animate-none" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      AI insight pass in progress
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This keeps visual setup fast without manual dashboard
                      configuration.
                    </p>
                  </div>
                </div>
              </Card>
            </Card>

            <Card className="surface-panel rounded-[2rem] border border-white/80 p-6 shadow-soft sm:p-8">
              <div className="mb-8 flex items-center justify-center">
                <div className="relative inline-flex h-28 w-28 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-primary/15 bg-primary/[0.08] animate-ping motion-reduce:animate-none" />
                  <div className="absolute inset-3 rounded-full border border-primary/20 bg-white/80" />
                  <div className="relative flex h-20 w-20 items-center justify-center rounded-full gradient-primary shadow-glow">
                    <Lightbulb className="h-10 w-10 text-primary-foreground" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 text-left">
                {processingSteps.map((step, index) => (
                  <Card
                    key={step}
                    className={`
                      flex items-center gap-4 rounded-[1.25rem] border px-4 py-4 transition-all duration-300
                      ${index === currentStep ? "border-primary/25 bg-primary/[0.08] shadow-card" : "border-white/80 bg-white/80"}
                      ${completedSteps.includes(index) ? "opacity-70" : ""}
                      ${index > currentStep ? "opacity-45" : ""}
                    `}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/80">
                      {completedSteps.includes(index) ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : index === currentStep ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary motion-reduce:animate-none" />
                      ) : (
                        <div className="h-2.5 w-2.5 rounded-full bg-muted-foreground/40" />
                      )}
                    </div>
                    <span
                      className={`text-sm ${index === currentStep ? "font-semibold text-foreground" : "text-muted-foreground"}`}
                    >
                      {step}
                    </span>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
