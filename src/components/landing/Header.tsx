import { Button } from "@/components/ui/button";
import tadaLogo from "@/assets/tada-logo.png";

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <div className="container mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={tadaLogo} alt="Tada" className="h-8 w-8" />
          <span className="font-semibold text-lg text-foreground">Tada</span>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
            Features
          </a>
          <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">
            How it works
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">Log in</Button>
          <Button variant="default" size="sm">Get started</Button>
        </div>
      </div>
    </header>
  );
}
