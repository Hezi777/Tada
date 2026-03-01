import tadaLogo from "@/assets/tada-logo.png";

export function Footer() {
  return (
    <footer className="px-4 pb-8 pt-4 sm:px-6">
      <div className="container">
        <div className="section-shell px-6 py-8 sm:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <a href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white shadow-card">
                <img src={typeof tadaLogo === 'string' ? tadaLogo : tadaLogo.src} alt="Tada" className="h-7 w-7" />
              </div>
              <div>
                <span className="font-display text-xl font-semibold text-foreground">Tada</span>
                <p className="text-sm text-muted-foreground">Calm analytics for fast-moving teams.</p>
              </div>
            </a>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="#"
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-secondary/70 hover:text-foreground"
              >
                Privacy
              </a>
              <a
                href="#"
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-secondary/70 hover:text-foreground"
              >
                Terms
              </a>
              <a
                href="#"
                className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-secondary/70 hover:text-foreground"
              >
                Contact
              </a>
            </div>

            <p className="text-sm font-medium text-muted-foreground">© 2025 Tada. All rights reserved.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
