import { ArrowRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CTAProps {
  onGetStarted: () => void;
}

export function CTA({ onGetStarted }: CTAProps) {
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6">
      <div className="container relative z-10">
        <div className="relative overflow-hidden rounded-[2.2rem] border border-white/80 px-6 py-12 shadow-soft sm:px-10 sm:py-16">
          <div className="absolute inset-0 gradient-primary opacity-[0.11]" />
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top,hsl(0_0%_100%/.86),transparent_55%)]" />
          <div className="relative mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm font-semibold text-primary shadow-card">
              <Lightbulb className="h-4 w-4" />
              Start free, no credit card
            </div>

            <h2 className="mt-8 text-4xl text-foreground sm:text-5xl">
              Ready to understand your data?
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Upload your first file and see Tada in action. It takes 30 seconds to go from
              spreadsheet to insight.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Button variant="hero" size="xl" onClick={onGetStarted}>
                Get started for free
                <ArrowRight className="ml-1 h-5 w-5" />
              </Button>
              <div className="rounded-full border border-white/80 bg-white/80 px-5 py-3 text-sm font-medium text-muted-foreground shadow-card">
                Average first dashboard time: under 1 minute
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
