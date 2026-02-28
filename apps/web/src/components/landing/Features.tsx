import { FileSpreadsheet, BarChart3, MessageSquare, Zap } from "lucide-react";

const features = [
  {
    icon: FileSpreadsheet,
    title: "Any file format",
    description: "CSV, Excel, Google Sheets. Just drag and drop — we handle the rest.",
  },
  {
    icon: Zap,
    title: "Instant dashboards",
    description: "AI analyzes your data structure and generates the perfect visualization.",
  },
  {
    icon: MessageSquare,
    title: "Chat with your data",
    description: "Ask questions in plain English. \"Show me sales by region\" just works.",
  },
  {
    icon: BarChart3,
    title: "Smart insights",
    description: "Automatic trend detection, anomaly alerts, and actionable recommendations.",
  },
];

export function Features() {
  return (
    <section id="features" className="relative px-4 py-24 sm:px-6">
      <div className="container">
        <div className="section-shell px-6 py-10 sm:px-10 sm:py-14">
          <div className="mb-14 max-w-2xl">
            <div className="eyebrow mb-5">Core Features</div>
            <h2 className="text-4xl text-foreground sm:text-5xl">
              Zero friction. Pure insight.
            </h2>
            <p className="mt-5 text-lg leading-8 text-muted-foreground">
              Tada removes everything that stands between you and understanding your data.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="group surface-panel relative overflow-hidden rounded-[1.75rem] border border-white/80 p-6 shadow-card transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-soft focus-within:-translate-y-1.5 focus-within:shadow-soft motion-reduce:hover:translate-y-0 motion-reduce:transition-none"
                style={{ animationDelay: `${index * 0.1}s` }}
                tabIndex={0}
              >
                <div className="absolute right-0 top-0 h-24 w-24 rounded-bl-[2.2rem] bg-primary/[0.08]" />
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[1.3rem] border border-white/80 bg-white shadow-card transition-all duration-300 group-hover:scale-105 group-hover:border-primary/25">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-display text-2xl font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
