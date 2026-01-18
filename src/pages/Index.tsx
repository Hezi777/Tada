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

type AppState = "landing" | "upload" | "processing" | "dashboard";

const Index = () => {
  const [appState, setAppState] = useState<AppState>("landing");

  const handleGetStarted = () => {
    setAppState("upload");
  };

  const handleFileUpload = () => {
    setAppState("processing");
  };

  const handleProcessingComplete = () => {
    setAppState("dashboard");
  };

  const handleLogout = () => {
    setAppState("landing");
  };

  if (appState === "upload") {
    return <UploadScreen onFileUpload={handleFileUpload} />;
  }

  if (appState === "processing") {
    return <ProcessingView onComplete={handleProcessingComplete} />;
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
