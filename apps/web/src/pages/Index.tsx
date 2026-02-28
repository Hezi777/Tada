import { useState } from "react";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { CTA } from "@/components/landing/CTA";
import { Footer } from "@/components/landing/Footer";
import { ProcessingView } from "@/components/app/ProcessingView";
import { AppShell } from "@/components/app/AppShell";
import { UploadScreen } from "@/components/app/UploadScreen";
import { parseDatasetFile, type DatasetState } from "@/lib/dataset";
import { uploadDataset, type DashboardState } from "@/lib/api";

type AppState = "landing" | "upload" | "processing" | "dashboard";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("landing");
  const [dataset, setDataset] = useState<DatasetState | null>(null);
  const [dashboardState, setDashboardState] = useState<DashboardState | null>(null);
  const [isUploadReady, setIsUploadReady] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleGetStarted = () => {
    setUploadError(null);
    setAppState("upload");
  };

  const handleFileUpload = async (file: File) => {
    setIsUploadReady(false);
    setUploadError(null);
    setAppState("processing");

    try {
      const [nextDataset, nextDashboard] = await Promise.all([
        parseDatasetFile(file),
        uploadDataset(file),
      ]);
      setDataset(nextDataset);
      setDashboardState(nextDashboard);
      setIsUploadReady(true);
    } catch {
      setDataset(null);
      setDashboardState(null);
      setUploadError("Upload failed. Check the API server and HF_API_KEY, then try again.");
      setAppState("upload");
    }
  };

  const handleProcessingComplete = () => {
    setAppState("dashboard");
  };

  const handleLogout = () => {
    setDataset(null);
    setDashboardState(null);
    setIsUploadReady(false);
    setUploadError(null);
    setAppState("landing");
  };

  if (appState === "upload") {
    return (
      <UploadScreen
        onFileUpload={handleFileUpload}
        onBack={handleLogout}
        errorMessage={uploadError}
      />
    );
  }

  if (appState === "processing") {
    return <ProcessingView onComplete={handleProcessingComplete} isReady={isUploadReady} />;
  }

  if (appState === "dashboard") {
    return (
      <AppShell
        onLogout={handleLogout}
        dataset={dataset}
        dashboardState={dashboardState}
        onDashboardUpdate={setDashboardState}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero onGetStarted={handleGetStarted} />
      <Features />
      <HowItWorks />
      <CTA onGetStarted={handleGetStarted} />
      <Footer />
    </div>
  );
};

export default Index;
