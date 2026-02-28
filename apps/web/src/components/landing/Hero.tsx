import { Sparkles, ArrowRight, BarChart3, MessageSquare, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

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
        <div className="section-shell px-6 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-16">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.72fr]">
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
                <div className="decor-ring flex items-center gap-2 rounded-full bg-white/85 px-4 py-2.5 shadow-card">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Instant dashboards</span>
                </div>
                <div className="decor-ring flex items-center gap-2 rounded-full bg-white/85 px-4 py-2.5 shadow-card">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Chat with your data</span>
                </div>
                <div className="decor-ring flex items-center gap-2 rounded-full bg-white/85 px-4 py-2.5 shadow-card">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-foreground">Smart visualizations</span>
                </div>
              </div>

              <p className="mt-12 text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground animate-fade-in-delay-3">
                Trusted by data teams at fast-growing companies
              </p>
            </div>

            <div className="relative animate-fade-in-delay-2">
              <div className="absolute -left-4 top-8 h-28 w-28 rounded-[1.75rem] border border-primary/15 bg-primary/10 blur-2xl" />
              <div className="surface-panel relative overflow-hidden rounded-[2rem] border border-white/80 p-5 shadow-soft">
                <div className="mb-5 flex items-center justify-between rounded-[1.4rem] border border-white/80 bg-white/85 px-4 py-3 shadow-card">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Live Snapshot</p>
                    <p className="mt-1 text-sm font-medium text-foreground">Revenue performance this quarter</p>
                  </div>
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">+18.4%</div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-[1.6rem] border border-white/80 bg-white/90 p-5 shadow-card">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Forecast</p>
                    <p className="mt-4 text-4xl font-extrabold text-foreground">$148K</p>
                    <div className="mt-5 h-24 overflow-hidden rounded-[1.25rem] bg-secondary/75 p-4">
                      <div className="flex h-full items-end gap-2">
                        {[44, 60, 58, 70, 75, 86, 94].map((height) => (
                          <div
                            key={height}
                            className="flex-1 rounded-t-full gradient-primary"
                            style={{ height: `${height}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-[1.6rem] border border-white/80 bg-white/90 p-5 shadow-card">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Questions asked</p>
                      <p className="mt-3 text-3xl font-bold text-foreground">214</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Teams iterate faster when every chart can be reshaped in conversation.
                      </p>
                    </div>

                    <div className="rounded-[1.6rem] border border-primary/15 bg-primary/[0.07] p-5 shadow-card">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Copilot prompt</p>
                      <p className="mt-3 text-sm leading-7 text-foreground">
                        Show me regional sales, highlight the outlier month, and add a category breakdown.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[1.5rem] border border-dashed border-primary/20 bg-white/70 px-4 py-3 text-sm text-muted-foreground">
                  Designed for calm, high-trust exploration instead of dashboard clutter.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
