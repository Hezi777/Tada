import { useRef, useState } from "react";
import { ArrowLeft, FileSpreadsheet, Lightbulb, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import tadaLogo from "@/assets/tada-logo.png";

interface UploadScreenProps {
  onFileUpload: (file: File) => void;
  onBack: () => void;
  errorMessage?: string | null;
}

export const UploadScreen = ({ onFileUpload, onBack, errorMessage }: UploadScreenProps) => {
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
    const [file] = Array.from(e.dataTransfer.files);
    if (file) {
      onFileUpload(file);
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div className="pointer-events-none absolute inset-0 gradient-glow" />

      <header className="px-4 pt-4 sm:px-6">
        <div className="container">
          <div className="glass flex items-center justify-between rounded-full border border-white/80 px-4 py-3 shadow-soft sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white shadow-card">
                <img src={tadaLogo} alt="Tada" className="h-7 w-7" />
              </div>
              <div>
                <span className="font-display text-xl font-semibold text-foreground">Tada</span>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">
                  Dataset Intake
                </p>
              </div>
            </div>

            <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to home
            </Button>
          </div>
        </div>
      </header>

      <main className="relative flex min-h-[calc(100vh-5.5rem)] items-center px-4 py-10 sm:px-6">
        <div className="container">
          <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="max-w-xl">
              <div className="eyebrow mb-6">
                <Lightbulb className="h-3.5 w-3.5" />
                Step 1 of 2
              </div>

              <h1 className="text-4xl text-foreground sm:text-5xl">
                Upload your <span className="text-gradient">data file</span>
              </h1>

              <p className="mt-6 text-lg leading-8 text-muted-foreground">
                Drop your CSV or Excel file and Tada will compose a dashboard with structure,
                charts, and a chat-ready summary in one pass.
              </p>

              <div className="mt-8 space-y-3">
                {[
                  "Automatic schema detection",
                  "Clean KPI and chart generation",
                  "Natural-language follow-up questions",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-full border border-white/80 bg-white/75 px-4 py-3 text-sm font-medium text-foreground shadow-card"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`section-shell p-4 sm:p-6 ${isDragging ? "shadow-glow" : ""}`}
            >
              <div
                className={`
                  flex min-h-[30rem] flex-col items-center justify-center rounded-[1.8rem] border-2 border-dashed px-6 py-10 text-center transition-all duration-300
                  ${isDragging ? "border-primary bg-primary/[0.08] scale-[1.01]" : "border-primary/20 bg-white/70 hover:border-primary/35"}
                `}
              >
                {errorMessage ? (
                  <div className="mb-6 w-full max-w-md rounded-[1.2rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {errorMessage}
                  </div>
                ) : null}

                <div
                  className={`
                    mb-6 flex h-20 w-20 items-center justify-center rounded-[1.75rem] border border-white/80 shadow-card transition-all duration-300
                    ${isDragging ? "gradient-primary text-primary-foreground" : "bg-white text-primary"}
                  `}
                >
                  <Upload className="h-8 w-8" />
                </div>

                <h2 className="font-display text-3xl font-semibold text-foreground">Drop your file here</h2>
                <p className="mt-3 text-sm text-muted-foreground">or click to browse from your computer</p>
                <p className="mb-8 mt-2 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
                  Maximum file size: 100MB
                </p>

                <Button onClick={handleFileSelect} size="lg" className="px-8">
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Choose File
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="mt-10 grid w-full max-w-xl gap-3 border-t border-border/80 pt-8 sm:grid-cols-3">
                  <div className="rounded-[1.2rem] border border-white/80 bg-white/85 px-4 py-4 shadow-card">
                    <div className="mx-auto mb-2 h-2.5 w-2.5 rounded-full bg-primary" />
                    <p className="text-sm font-semibold text-foreground">CSV</p>
                    <p className="mt-1 text-xs text-muted-foreground">Fast ingestion for flat files</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/80 bg-white/85 px-4 py-4 shadow-card">
                    <div className="mx-auto mb-2 h-2.5 w-2.5 rounded-full bg-sky-500" />
                    <p className="text-sm font-semibold text-foreground">Excel (.xlsx)</p>
                    <p className="mt-1 text-xs text-muted-foreground">Modern workbook support</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/80 bg-white/85 px-4 py-4 shadow-card">
                    <div className="mx-auto mb-2 h-2.5 w-2.5 rounded-full bg-indigo-500" />
                    <p className="text-sm font-semibold text-foreground">Excel (.xls)</p>
                    <p className="mt-1 text-xs text-muted-foreground">Legacy spreadsheet imports</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
