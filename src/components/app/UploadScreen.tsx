import { useState, useRef } from "react";
import { Upload, FileSpreadsheet, ArrowLeft, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import tadaLogo from "@/assets/tada-logo.png";

interface UploadScreenProps {
  onFileUpload: () => void;
  onBack: () => void;
}

export const UploadScreen = ({ onFileUpload, onBack }: UploadScreenProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    onFileUpload();
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6 border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={tadaLogo} alt="Tada" className="h-8 w-8" />
            <span className="text-xl font-bold text-foreground">Tada</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to home
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Title Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border mb-6">
            <Lightbulb className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Step 1 of 2</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            Upload your <span className="text-gradient">data file</span>
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Drop your CSV or Excel file and we'll generate an AI-powered dashboard instantly.
          </p>
        </div>

        {/* Upload Card */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            w-full max-w-xl p-10 rounded-2xl border-2 border-dashed transition-all duration-300 bg-card
            motion-reduce:transition-none
            ${isDragging 
              ? "border-primary bg-primary/5 scale-[1.02] shadow-glow" 
              : "border-border hover:border-primary/50 hover:shadow-soft"
            }
          `}
        >
          <div className="flex flex-col items-center text-center">
            {/* Upload Icon */}
            <div className={`
              w-16 h-16 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300
              motion-reduce:transition-none
              ${isDragging 
                ? "bg-primary text-primary-foreground" 
                : "bg-secondary text-primary"
              }
            `}>
              <Upload className="w-7 h-7" />
            </div>

            {/* Text */}
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Drop your file here
            </h2>
            <p className="text-muted-foreground text-sm mb-1">
              or click to browse from your computer
            </p>
            <p className="text-muted-foreground/60 text-xs mb-6">
              Maximum file size: 100MB
            </p>

            {/* Choose File Button */}
            <Button
              onClick={handleFileSelect}
              className="px-6"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Choose File
            </Button>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* File Type Indicators */}
            <div className="flex items-center gap-6 mt-6 pt-6 border-t border-border w-full justify-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span className="text-muted-foreground text-sm">CSV</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-muted-foreground text-sm">Excel (.xlsx)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-muted-foreground text-sm">Excel (.xls)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sample Data Option */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">Don't have a file ready?</p>
          <Button variant="outline" size="sm" onClick={onFileUpload}>
            Try with sample data
          </Button>
        </div>
      </main>
    </div>
  );
};
