import { useState, useRef } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import tadaLogo from "@/assets/tada-logo.png";

interface UploadScreenProps {
  onFileUpload: () => void;
}

export const UploadScreen = ({ onFileUpload }: UploadScreenProps) => {
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
    // Simulate file upload
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
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      {/* Header */}
      <header className="w-full py-6 px-8">
        <div className="flex items-center gap-2">
          <img src={tadaLogo} alt="TADA" className="h-8 w-8" />
          <span className="text-xl font-bold text-white">TADA</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 -mt-16">
        {/* Title Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Data insights in{" "}
            <span className="text-primary">seconds</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Upload your CSV or Excel file and get AI-powered dashboards with interactive
            charts. No setup, no technical skills needed.
          </p>
        </div>

        {/* Upload Card */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            w-full max-w-xl p-12 rounded-2xl border-2 border-dashed transition-all duration-300
            ${isDragging 
              ? "border-primary bg-primary/10 scale-[1.02]" 
              : "border-slate-700 bg-slate-900/50 hover:border-slate-600"
            }
          `}
        >
          <div className="flex flex-col items-center text-center">
            {/* Upload Icon */}
            <div className={`
              w-20 h-20 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300
              ${isDragging 
                ? "bg-primary/20" 
                : "bg-slate-800"
              }
            `}>
              <Upload className={`w-10 h-10 transition-colors duration-300 ${isDragging ? "text-primary" : "text-primary"}`} />
            </div>

            {/* Text */}
            <h2 className="text-xl font-semibold text-white mb-2">
              Upload your data file
            </h2>
            <p className="text-slate-400 mb-2">
              Drop your CSV or Excel file here, or click to browse.
            </p>
            <p className="text-slate-500 text-sm mb-6">
              Maximum file size: 100MB
            </p>

            {/* Choose File Button */}
            <Button
              onClick={handleFileSelect}
              className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
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
            <div className="flex items-center gap-6 mt-6">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary"></span>
                <span className="text-slate-400 text-sm">CSV</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-400 text-sm">Excel</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
