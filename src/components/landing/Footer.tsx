import tadaLogo from "@/assets/tada-logo.png";

export function Footer() {
  return (
    <footer className="py-12 border-t border-border">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <img src={tadaLogo} alt="Tada" className="h-6 w-6" />
            <span className="font-semibold text-foreground">Tada</span>
          </div>
          
          <div className="flex items-center gap-8">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              Privacy
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              Terms
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
              Contact
            </a>
          </div>
          
          <p className="text-sm text-muted-foreground">
            © 2025 Tada. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
