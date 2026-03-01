import { Button } from "@/components/ui/button";
import tadaLogo from "@/assets/tada-logo.png";

interface HeaderProps {
  isAuthenticated: boolean;
  userEmail: string | null;
  onLogin: () => void;
  onGetStarted: () => void;
  onOpenWorkspace: () => void;
}

function getDisplayInitial(email: string | null): string {
  if (!email) {
    return "T";
  }
  return email.trim().charAt(0).toUpperCase() || "T";
}

export function Header({
  isAuthenticated,
  userEmail,
  onLogin,
  onGetStarted,
  onOpenWorkspace,
}: HeaderProps) {
  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[60] flex h-8 items-center justify-center bg-primary/10 px-4 text-xs font-medium text-primary backdrop-blur-md">
        ✨ Now in beta — free while it lasts
      </div>
      <header className="fixed left-0 right-0 top-8 z-50 px-4 pt-4 sm:px-6">
        <div className="container">
          <div className="glass flex h-16 items-center justify-between rounded-full border border-white/80 px-4 shadow-soft sm:px-6">
            <a href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/80 bg-white shadow-card">
                <img src={typeof tadaLogo === 'string' ? tadaLogo : tadaLogo.src} alt="Tada" className="h-7 w-7" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-display text-lg font-semibold text-foreground">Tada</span>
                <span className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-primary/80">
                  Instant Insights
                </span>
              </div>
            </a>

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
              {isAuthenticated ? (
                <>
                  <div className="hidden items-center gap-3 rounded-full border border-white/80 bg-white/80 px-2 py-1.5 sm:flex">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {getDisplayInitial(userEmail)}
                    </div>
                    <div className="max-w-[160px] pr-2">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {userEmail ?? "Signed in"}
                      </p>
                      <p className="text-xs text-muted-foreground">Workspace ready</p>
                    </div>
                  </div>
                  <Button variant="default" size="sm" onClick={onOpenWorkspace}>
                    Open workspace
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={onLogin}>
                    Log in
                  </Button>
                  <Button variant="default" size="sm" onClick={onGetStarted}>
                    Get started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
