import { Sparkles, ArrowRight, BarChart3, MessageSquare, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedDashboardMockup } from "./AnimatedDashboardMockup";

interface HeroProps {
  onGetStarted: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 pb-10 pt-28 sm:px-6">
      <div className="absolute inset-0 gradient-glow pointer-events-none" />
      <div className="editorial-grid absolute inset-x-8 top-16 bottom-6 pointer-events-none opacity-70" />
      <div className="absolute left-[10%] top-28 h-40 w-40 rounded-full bg-primary/10 blur-3xl animate-float" />
      <div
        className="absolute bottom-16 right-[8%] h-56 w-56 rounded-full bg-primary/12 blur-3xl animate-float"
        style={{ animationDelay: "-3s" }}
      />

      <div className="container relative z-10">
        <div className="grid items-center gap-12 py-10 lg:grid-cols-[1.1fr_0.72fr] lg:gap-16 lg:py-16">
          <div className="max-w-3xl">
            <div className="eyebrow mb-7 animate-fade-in">
              <Sparkles className="h-4 w-4" />
              AI-powered analytics in seconds
            </div>

            <h1 className="text-5xl leading-[0.92] text-foreground animate-fade-in-delay-1 sm:text-6xl lg:text-7xl">
              Turn raw spreadsheets into a clear, living story for your team.
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-muted-foreground animate-fade-in-delay-2 sm:text-xl">
              Upload any CSV or Excel file, generate a polished dashboard in seconds, and keep exploring
              through plain-English questions that reshape the view as you think.
            </p>

            <div className="mt-10 flex flex-col items-start gap-4 animate-fade-in-delay-3 sm:flex-row sm:items-center">
              <Button variant="hero" size="xl" onClick={onGetStarted}>
                Get started free
                <ArrowRight className="ml-1 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" onClick={onGetStarted}>
                Try with sample data
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap gap-3 animate-fade-in-delay-3">
              <Badge variant="outline" className="decor-ring flex items-center gap-2 rounded-full bg-white/85 px-4 py-2.5 shadow-card hover:bg-white/85">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Instant dashboards</span>
              </Badge>
              <Badge variant="outline" className="decor-ring flex items-center gap-2 rounded-full bg-white/85 px-4 py-2.5 shadow-card hover:bg-white/85">
                <MessageSquare className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Chat with your data</span>
              </Badge>
              <Badge variant="outline" className="decor-ring flex items-center gap-2 rounded-full bg-white/85 px-4 py-2.5 shadow-card hover:bg-white/85">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Smart visualizations</span>
              </Badge>
            </div>

            <div className="mt-14 max-w-lg border-t border-primary/10 pt-8 animate-fade-in-delay-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/80 mb-5 text-center sm:text-left">
                Trusted by fast-growing teams
              </p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-8 gap-y-4 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-500">
                {/* Placeholder logos using SVG paths */}
                <svg className="h-6 text-slate-400" viewBox="0 0 100 30" fill="currentColor">
                  <path d="M10,15 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0 M25,5 v20 h5 v-20 h-5 M35,15 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0 M50,5 v20 h5 v-20 h-5 M60,15 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0" />
                </svg>
                <svg className="h-5 text-slate-400" viewBox="0 0 100 30" fill="currentColor">
                  <path d="M10,5 h20 v5 h-15 v5 h10 v5 h-10 v5 h15 v5 h-20 z M40,5 h5 l10,25 h-6 l-2,-6 h-9 l-2,6 h-5 z M45,18 h6 l-3,-9 z" />
                </svg>
                <svg className="h-6 text-slate-400" viewBox="0 0 120 30" fill="currentColor">
                  <path d="M10,5 v20 h5 v-10 l10,10 h7 l-11,-11 l10,-9 h-7 l-9,9 v-9 z M40,5 v20 h15 v-5 h-10 v-2 h8 v-5 h-8 v-3 h10 v-5 z M65,5 v20 h5 v-20 z" />
                </svg>
                <svg className="h-5 text-slate-400" viewBox="0 0 100 30" fill="currentColor">
                  <path d="M10,25 h20 v5 h-25 v-25 h5 z M35,15 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0 M50,15 a5,5 0 1,0 10,0 a5,5 0 1,0 -10,0 M65,5 v25 h5 v-25 z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="relative animate-fade-in-delay-2 flex justify-center lg:justify-end">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-primary/20 blur-[100px] pointer-events-none" />
            <AnimatedDashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}
