import { useState, useEffect } from "react";
import { Loader2, Lightbulb, Check } from "lucide-react";

interface ProcessingViewProps {
  onComplete: () => void;
}

const processingSteps = [
  "Reading file structure...",
  "Analyzing column types...",
  "Detecting relationships...",
  "Identifying key metrics...",
  "Generating visualizations...",
  "Building your dashboard...",
];

export function ProcessingView({ onComplete }: ProcessingViewProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev < processingSteps.length - 1) {
          setCompletedSteps((completed) => [...completed, prev]);
          return prev + 1;
        } else {
          clearInterval(interval);
          setTimeout(() => {
            setCompletedSteps((completed) => [...completed, prev]);
            setTimeout(onComplete, 500);
          }, 800);
          return prev;
        }
      });
    }, 700);

    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-md w-full mx-auto px-6 text-center">
        {/* Animated icon */}
        <div className="relative inline-flex items-center justify-center w-24 h-24 mb-8">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping motion-reduce:animate-none" />
          <div className="relative w-20 h-20 rounded-full gradient-primary flex items-center justify-center shadow-glow">
            <Lightbulb className="h-10 w-10 text-primary-foreground animate-pulse-soft motion-reduce:animate-none" />
          </div>
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-2">
          Analyzing your data
        </h2>
        <p className="text-muted-foreground mb-10">
          Tada is learning your data's structure and patterns
        </p>

        {/* Steps */}
        <div className="space-y-3 text-left">
          {processingSteps.map((step, index) => (
            <div
              key={step}
              className={`
                flex items-center gap-3 p-3 rounded-lg transition-all duration-300
                motion-reduce:transition-none
                ${index === currentStep ? 'bg-primary/5 border border-primary/20' : ''}
                ${completedSteps.includes(index) ? 'opacity-60' : ''}
                ${index > currentStep ? 'opacity-30' : ''}
              `}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                {completedSteps.includes(index) ? (
                  <Check className="h-4 w-4 text-primary" />
                ) : index === currentStep ? (
                  <Loader2 className="h-4 w-4 text-primary animate-spin motion-reduce:animate-none" />
                ) : (
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                )}
              </div>
              <span className={`text-sm ${index === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                {step}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
