import { ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CTAProps {
  onGetStarted: () => void;
}

export function CTA({ onGetStarted }: CTAProps) {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 gradient-primary opacity-5" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
      
      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Start free, no credit card</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Ready to understand your data?
          </h2>
          
          <p className="text-lg text-muted-foreground mb-10">
            Upload your first file and see TADA in action. 
            It takes 30 seconds to go from spreadsheet to insight.
          </p>
          
          <Button variant="hero" size="xl" onClick={onGetStarted}>
            Get started for free
            <ArrowRight className="h-5 w-5 ml-1" />
          </Button>
        </div>
      </div>
    </section>
  );
}
