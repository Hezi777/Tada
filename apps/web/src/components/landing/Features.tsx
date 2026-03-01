import { FileSpreadsheet, BarChart3, MessageSquare, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";

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
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card
                  className="group relative h-full overflow-hidden rounded-[1.75rem] border border-white/80 bg-[#F4F7FF] p-6 shadow-card transition-all duration-300 ease-out hover:-translate-y-1.5 hover:shadow-soft focus-within:-translate-y-1.5 focus-within:shadow-soft motion-reduce:hover:translate-y-0 motion-reduce:transition-none"
                  tabIndex={0}
                >
                  {/* Large Corner Number */}
                  <div className="absolute right-6 top-6 text-4xl font-extrabold text-primary/10 transition-colors duration-300 group-hover:text-primary/20">
                    0{index + 1}
                  </div>

                  {/* Ghost Icon Bottom Right */}
                  <feature.icon className="absolute -bottom-4 -right-4 h-32 w-32 text-primary/[0.03] transition-transform duration-500 group-hover:scale-110 group-hover:text-primary/[0.06]" />

                  <div className="relative z-10">
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-[1.3rem] border border-white/80 bg-white shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-primary/25 group-hover:shadow-md">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-display text-2xl font-semibold text-foreground">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.description}</p>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
