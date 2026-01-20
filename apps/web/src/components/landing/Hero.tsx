import { Sparkles, ArrowRight, BarChart3, MessageSquare, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  onGetStarted: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 gradient-glow pointer-events-none" />
      
      {/* Floating orbs */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '-3s' }} />

      <div className="container mx-auto px-6 text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border mb-8 animate-fade-in">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">AI-powered analytics in seconds</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight mb-6 animate-fade-in-delay-1">
          From spreadsheet to
          <br />
          <span className="text-gradient">instant insights</span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-in-delay-2">
          Upload any CSV or Excel file. Get an AI-generated dashboard in seconds.
          Ask questions in plain English. No setup required.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in-delay-3">
          <Button variant="hero" size="xl" onClick={onGetStarted}>
            Get started free
            <ArrowRight className="h-5 w-5 ml-1" />
          </Button>
          <Button variant="outline" size="lg" onClick={onGetStarted}>
            Try with sample data
          </Button>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap items-center justify-center gap-4 animate-fade-in-delay-3">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Instant dashboards</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border">
            <MessageSquare className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Chat with your data</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Smart visualizations</span>
          </div>
        </div>

        {/* Trust indicators */}
        <p className="mt-16 text-sm text-muted-foreground animate-fade-in-delay-3">
          Trusted by data teams at fast-growing companies
        </p>
      </div>
    </section>
  );
}
