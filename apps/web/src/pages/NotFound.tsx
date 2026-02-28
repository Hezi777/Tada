import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 gradient-glow" />
      <div className="pointer-events-none absolute inset-x-8 top-10 bottom-10 editorial-grid opacity-60" />

      <div className="container relative">
        <div className="mx-auto max-w-3xl section-shell px-8 py-14 text-center sm:px-14">
          <div className="eyebrow mb-6">Route Not Found</div>
          <p className="text-sm font-semibold uppercase tracking-[0.34em] text-primary/80">404</p>
          <h1 className="mt-4 text-5xl text-foreground sm:text-6xl">This page drifted off the dashboard.</h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-muted-foreground">
            The route <span className="font-semibold text-foreground">{location.pathname}</span> does not exist in
            this app. Head back to the main experience and keep exploring.
          </p>
          <div className="mt-10 flex justify-center">
            <Button asChild size="lg">
              <a href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return to Home
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
