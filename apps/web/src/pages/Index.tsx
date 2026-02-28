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
import { uploadDataset } from "@/lib/api";
import {
  initializeDashboardStore,
  resetDashboardStore,
} from "@/lib/dashboard-store";

type AppState = "landing" | "upload" | "processing" | "dashboard";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("landing");
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
      const nextDashboard = await uploadDataset(file);
      initializeDashboardStore(nextDashboard);
      setIsUploadReady(true);
    } catch (error) {
      resetDashboardStore();
      const message =
        error instanceof Error && error.message
          ? error.message.replace(/_/g, " ")
          : "Upload failed. Check the API server and try again.";
      setUploadError(message);
      setAppState("upload");
    }
  };

  const handleProcessingComplete = () => {
    setAppState("dashboard");
  };

  const handleLogout = () => {
    resetDashboardStore();
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
    return <AppShell onLogout={handleLogout} />;
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
