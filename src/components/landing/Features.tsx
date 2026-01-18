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
    <section id="features" className="py-24 relative">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Zero friction. Pure insight.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Tada removes everything that stands between you and understanding your data.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border transition-all duration-300 ease-out hover:shadow-soft hover:border-primary/30 hover:-translate-y-1 hover:scale-[1.02] focus-within:shadow-soft focus-within:border-primary/30 motion-reduce:hover:translate-y-0 motion-reduce:hover:scale-100 motion-reduce:transition-none"
              style={{ animationDelay: `${index * 0.1}s` }}
              tabIndex={0}
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 transition-all duration-300 group-hover:bg-primary/10 group-hover:scale-110 group-hover:shadow-glow motion-reduce:group-hover:scale-100 motion-reduce:transition-none">
                <feature.icon className="h-6 w-6 text-primary transition-transform duration-300 group-hover:scale-110 motion-reduce:group-hover:scale-100" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
