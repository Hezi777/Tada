"use client";

import Link from "next/link";
import { Github, Linkedin, Twitter } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { TadaLogo } from "@/shared/brand/TadaLogo";
import { LinearReveal } from "./LinearReveal";
import { Separator } from "./Separator";

const NAV = [
  {
    header: "Product",
    links: [
      { label: "Home", href: "/" },
      { label: "Features", href: "/#features" },
      { label: "How it works", href: "/#how-it-works" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    header: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
  {
    header: "Contact",
    links: [{ label: "Contact us", href: "mailto:hello@tada.app" }],
  },
];

const SOCIALS = [
  { icon: Twitter, label: "Twitter / X", href: "https://x.com" },
  { icon: Linkedin, label: "LinkedIn", href: "https://linkedin.com" },
  { icon: Github, label: "GitHub", href: "https://github.com" },
];

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export function Footer() {
  const shouldReduceMotion = useReducedMotion();

  const fadeUp = (delay: number) => ({
    initial: shouldReduceMotion
      ? { opacity: 0 }
      : { opacity: 0, y: 20, filter: "blur(6px)" },
    whileInView: shouldReduceMotion
      ? { opacity: 1 }
      : { opacity: 1, y: 0, filter: "blur(0px)" },
    viewport: { once: true },
    transition: { duration: 0.6, delay, ease },
  });

  return (
    <footer className="relative overflow-hidden border-t border-[#00327d]/10 bg-background px-4 pb-10 pt-20 sm:px-6">
      <div className="mx-auto max-w-7xl">
        {/* Top: brand + nav columns */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.2fr_2fr]">
          {/* Brand */}
          <motion.div {...fadeUp(0)}>
            <Link
              href="/"
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
            >
              <TadaLogo className="h-9 w-9 text-primary" />
              <span className="font-sans text-xl font-bold text-foreground">
                Tada
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-7 text-muted-foreground">
              Calm analytics for fast-moving teams. Upload a file, get a
              dashboard, ask anything.
            </p>

            {/* Socials */}
            <div className="mt-6 flex items-center gap-3">
              {SOCIALS.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#00327d]/10 text-muted-foreground transition-colors duration-200 hover:border-primary/20 hover:text-primary"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </motion.div>

          {/* Nav columns */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            {NAV.map((col, colIndex) => (
              <motion.div key={col.header} {...fadeUp(0.1 + colIndex * 0.08)}>
                <p className="mb-4 text-sm font-semibold text-foreground">
                  {col.header}
                </p>
                <ul className="flex flex-col gap-3">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground transition-colors duration-200 hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <motion.div {...fadeUp(0.3)} className="mt-14 flex justify-center">
          <Separator
            direction="horizontal"
            className="w-full bg-[#00327d]/10"
          />
        </motion.div>

        {/* Bottom row */}
        <motion.div
          {...fadeUp(0.36)}
          className="mt-8 flex flex-col items-center justify-between gap-4 sm:flex-row"
        >
          <p className="text-sm text-muted-foreground/70">
            &copy; 2026 Tada. All rights reserved.
          </p>
          <div className="flex items-center gap-3 text-sm text-muted-foreground/70">
            <Link
              href="/terms"
              className="transition-colors hover:text-primary"
            >
              Terms
            </Link>
            <Separator direction="vertical" className="bg-[#00327d]/10" />
            <Link
              href="/privacy"
              className="transition-colors hover:text-primary"
            >
              Privacy
            </Link>
          </div>
        </motion.div>

        {/* Giant wordmark */}
        <div className="mt-10 flex justify-center overflow-hidden sm:mt-16">
          <LinearReveal
            text="Tada"
            as="span"
            delay={0.2}
            className="select-none text-[22vw] font-bold leading-none tracking-tight text-primary/[0.06] sm:text-[18vw] md:text-[14vw]"
          />
        </div>
      </div>
    </footer>
  );
}
