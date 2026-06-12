import { useEffect, useState } from "react";
import { Check, Lightbulb, Loader2 } from "lucide-react";
import { Card } from "@/shared/ui/card";

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
    <div className="flex h-full flex-col items-center justify-center px-5 py-6">
      <div className="mx-auto grid w-full max-w-5xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="rounded-[24px] border-0 bg-white p-8 shadow-[0_22px_52px_-38px_rgba(25,28,30,0.14)] sm:p-10">
          <div className="inline-flex rounded-full bg-[rgba(0,50,125,0.08)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
            Generating Dashboard
          </div>
          <h2 className="mt-6 font-display text-4xl text-[var(--color-text-primary)] sm:text-5xl">
            Analyzing your data
          </h2>
          <p className="mt-5 max-w-xl text-lg leading-8 text-[var(--color-text-secondary)]">
            Tada is learning your dataset&apos;s structure, surfacing useful
            metrics, and assembling a dashboard that&apos;s ready to explore.
          </p>

          <Card className="mt-8 rounded-[20px] border-0 bg-[var(--color-surface-muted)] p-5 shadow-none">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)] text-white">
                <Lightbulb className="h-6 w-6 motion-reduce:animate-none" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                  AI insight pass in progress
                </p>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  This keeps visual setup fast without manual dashboard
                  configuration.
                </p>
              </div>
            </div>
          </Card>
        </Card>

        <Card className="rounded-[24px] border-0 bg-white p-8 shadow-[0_22px_52px_-38px_rgba(25,28,30,0.14)] sm:p-10">
          <div className="mb-8 flex items-center justify-center">
            <div className="relative inline-flex h-28 w-28 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-[rgba(0,50,125,0.08)]" />
              <div className="absolute inset-3 rounded-full bg-[var(--color-surface-muted)]" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent)] text-white">
                <Lightbulb className="h-10 w-10" />
              </div>
            </div>
          </div>

          <div className="space-y-3 text-left">
            {processingSteps.map((step, index) => (
              <Card
                key={step}
                className={`flex items-center gap-4 rounded-[20px] border-0 px-4 py-4 transition-all duration-300 ${
                  index === currentStep
                    ? "bg-[rgba(0,50,125,0.08)]"
                    : "bg-[var(--color-surface-muted)]"
                } ${completedSteps.includes(index) ? "opacity-75" : ""} ${index > currentStep ? "opacity-50" : ""}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white">
                  {completedSteps.includes(index) ? (
                    <Check className="h-4 w-4 text-[var(--color-accent)]" />
                  ) : index === currentStep ? (
                    <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent)] motion-reduce:animate-none" />
                  ) : (
                    <div className="h-2.5 w-2.5 rounded-full bg-[var(--color-text-muted)]" />
                  )}
                </div>
                <span
                  className={`text-sm ${index === currentStep ? "font-semibold text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"}`}
                >
                  {step}
                </span>
              </Card>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
