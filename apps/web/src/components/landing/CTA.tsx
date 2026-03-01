import { ArrowRight, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CTAProps {
  onGetStarted: () => void;
}

export function CTA({ onGetStarted }: CTAProps) {
  return (
    <section className="relative overflow-hidden px-4 py-24 sm:px-6">
      <div className="container relative z-10">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#3B82F6] to-[#2563EB] px-6 py-16 shadow-2xl sm:px-16 sm:py-20">
          {/* Subtle dot pattern texture overlay */}
          <div
            className="absolute inset-0 opacity-20 mix-blend-overlay"
            style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}
          />
          {/* Large soft glow accents */}
          <div className="absolute -left-32 -top-32 h-64 w-64 rounded-full bg-white/20 blur-[80px]" />
          <div className="absolute -bottom-32 -right-32 h-64 w-64 rounded-full bg-blue-300/30 blur-[80px]" />

          <div className="relative mx-auto max-w-3xl text-center flex flex-col items-center">
            <h2 className="text-4xl text-white font-bold sm:text-5xl leading-tight">
              Ready to understand your data?
            </h2>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-blue-100">
              Upload your first file and see Tada in action. It takes 30 seconds to go from
              spreadsheet to insight.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center">
              <Button
                size="xl"
                onClick={onGetStarted}
                className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg transition-all hover:scale-105 active:scale-95 text-lg h-14 px-8"
              >
                Get started for free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="mt-5 text-sm font-medium text-blue-200/80">
                No credit card required &bull; Cancel anytime
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
