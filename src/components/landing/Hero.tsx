import { useState } from "react";
import { Upload, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroProps {
  onGetStarted: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onGetStarted();
  };

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

        {/* Upload zone */}
        <div 
          className={`
            max-w-2xl mx-auto p-8 rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer animate-fade-in-delay-3
            ${isDragging 
              ? 'border-primary bg-primary/5 scale-[1.02]' 
              : 'border-border hover:border-primary/50 hover:bg-secondary/50'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={onGetStarted}
        >
          <div className="flex flex-col items-center gap-4">
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
              ${isDragging ? 'bg-primary text-primary-foreground' : 'bg-secondary text-primary'}
            `}>
              <Upload className="h-7 w-7" />
            </div>
            <div>
              <p className="font-medium text-foreground mb-1">
                Drop your file here or click to upload
              </p>
              <p className="text-sm text-muted-foreground">
                CSV, Excel, or any tabular data
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 animate-fade-in-delay-3">
          <Button variant="hero" size="xl" onClick={onGetStarted}>
            Try with sample data
            <ArrowRight className="h-5 w-5 ml-1" />
          </Button>
        </div>

        {/* Trust indicators */}
        <p className="mt-12 text-sm text-muted-foreground animate-fade-in-delay-3">
          Trusted by data teams at fast-growing companies
        </p>
      </div>
    </section>
  );
}
