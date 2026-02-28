import { Button } from "@/components/ui/button";
import tadaLogo from "@/assets/tada-logo.png";

export function Header() {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 px-4 pt-4 sm:px-6">
      <div className="container">
        <div className="glass flex h-16 items-center justify-between rounded-full border border-white/80 px-4 shadow-soft sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white shadow-card">
              <img src={tadaLogo} alt="Tada" className="h-7 w-7" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-semibold text-foreground">Tada</span>
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-primary/80">
                Instant Insights
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-3 rounded-full border border-white/70 bg-white/70 px-2 py-1 md:flex">
            <a
              href="#features"
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground"
            >
              How it works
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              Log in
            </Button>
            <Button variant="default" size="sm">
              Get started
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
