'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { TadaLogo } from '@/components/brand/TadaLogo';

const NAV = [
  {
    header: 'Product',
    links: [
      { label: 'Home', href: '/' },
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
    ],
  },
  {
    header: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
    ],
  },
  {
    header: 'Contact',
    links: [
      { label: 'Schedule a call', href: '#' },
      { label: 'Contact us', href: '#' },
    ],
  },
];

export function Footer() {
  return (
    <motion.footer
      className="bg-[#F8FAFC] px-4 pb-8 pt-16 sm:px-6"
      initial={{ y: 20, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
    >
      {/* 4-column grid */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 md:grid-cols-4">
        {/* Col 1: Logo + tagline */}
        <div>
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-80"
          >
            <TadaLogo className="h-10 w-10 text-[var(--color-accent)]" />
            <span className="ml-2 font-sans text-xl font-bold text-slate-900">
              Tada
            </span>
          </Link>
          <p className="mt-2 text-sm text-slate-500">
            Calm analytics for fast-moving teams.
          </p>
          <a
            href="mailto:hello@tada.so"
            className="mt-1 block text-sm text-slate-500 transition-colors hover:text-slate-900"
          >
            hello@tada.so
          </a>
        </div>

        {/* Col 2-4: Nav columns */}
        {NAV.map((col) => (
          <div key={col.header}>
            <p className="mb-4 text-sm font-semibold text-slate-900">
              {col.header}
            </p>
            <ul className="flex flex-col gap-3">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-sm text-slate-600 transition-colors duration-200 hover:text-slate-900"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="mx-auto mt-12 mb-8 max-w-7xl border-t border-slate-200" />

      {/* Bottom row */}
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <p className="text-sm text-slate-400">© 2025 Tada. All rights reserved.</p>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <a href="#" className="transition-colors hover:text-slate-600">
            Terms
          </a>
          <span>·</span>
          <a href="#" className="transition-colors hover:text-slate-600">
            Privacy
          </a>
        </div>
        <a
          href="https://x.com"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Twitter / X"
          className="text-slate-400 transition-colors hover:text-slate-600"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.904-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
          </svg>
        </a>
      </div>
    </motion.footer>
  );
}
