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
            TADA removes everything that stands between you and understanding your data.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={feature.title}
              className="group p-6 rounded-2xl bg-card border border-border hover:shadow-card hover:border-primary/20 transition-all duration-300"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                <feature.icon className="h-6 w-6 text-primary" />
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
