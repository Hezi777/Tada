"use client";

import Link from "next/link";
import { TadaLogo } from "@/shared/brand/TadaLogo";
import { LinearReveal } from "./LinearReveal";
import { Separator } from "./Separator";

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-[#00327d]/10 bg-background px-4 pb-6 pt-14 sm:px-6">
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 text-sm text-muted-foreground/70 sm:flex-row">
        <p>&copy; 2026 Tada. All rights reserved.</p>
        <div className="flex items-center gap-3">
          <Link href="/terms" className="transition-colors hover:text-primary">
            Terms
          </Link>
          <Separator direction="vertical" className="bg-[#00327d]/10" />
          <Link href="/privacy" className="transition-colors hover:text-primary">
            Privacy
          </Link>
          <Separator direction="vertical" className="bg-[#00327d]/10" />
          <a
            href="mailto:hello@tada.app"
            className="transition-colors hover:text-primary"
          >
            Contact
          </a>
        </div>
      </div>

      {/* Signature wordmark: bulb + "Tada", bulb sized to match the text,
          both at one uniform faint tone. */}
      <div className="mt-6 flex select-none items-center justify-center gap-[2vw] overflow-hidden opacity-[0.13]">
        <TadaLogo className="h-[13vw] w-[13vw] text-primary" />
        <LinearReveal
          text="Tada"
          as="span"
          delay={0.1}
          className="text-[16vw] font-black leading-[0.8] tracking-tight text-primary"
        />
      </div>
    </footer>
  );
}
