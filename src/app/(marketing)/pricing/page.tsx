import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Header } from "@/app/(marketing)/_components/Header";
import { Footer } from "@/app/(marketing)/_components/Footer";

export const metadata: Metadata = {
  title: "Pricing — Tada",
  description:
    "Start free and upgrade when you need more. Simple plans for AI-generated dashboards from your CSV, Excel, and PDF data.",
};

const tiers = [
  {
    name: "Free",
    price: "₪0",
    period: "forever",
    description: "Everything you need to see your first dashboard.",
    features: [
      "1 dashboard",
      "3 uploads per month",
      "CSV & Excel files",
      "Chat with your data in Hebrew & English",
    ],
    cta: "Start free",
    highlighted: false,
    comingSoon: false,
  },
  {
    name: "Pro",
    price: "₪49",
    period: "per month",
    description: "For people who live in their numbers every week.",
    features: [
      "Unlimited dashboards",
      "PDF upload",
      "Priority generation",
      "Chat history",
      "Everything in Free",
    ],
    cta: "Get started",
    highlighted: true,
    comingSoon: true,
  },
  {
    name: "Business",
    price: "₪149",
    period: "per month",
    description: "For teams combining data from more than one source.",
    features: [
      "Multiple datasets per dashboard",
      "Premium support",
      "Everything in Pro",
    ],
    cta: "Get started",
    highlighted: false,
    comingSoon: true,
  },
];

const faqs = [
  {
    question: "When will paid plans be available?",
    answer:
      "Tada is currently in beta and every feature is free while we polish the product. Paid plans launch soon — create a free account now and we will let you know before anything changes.",
  },
  {
    question: "What currency are prices in?",
    answer:
      "All prices are in Israeli new shekels (₪). When billing goes live you will be able to pay with any major credit card, and you will always see the full price before you are charged.",
  },
  {
    question: "Can I change or cancel my plan?",
    answer:
      "Yes. You will be able to upgrade, downgrade, or cancel at any time from your account settings. Downgrades and cancellations take effect at the end of the current billing period — no phone calls, no retention forms.",
  },
  {
    question: "What happens to my dashboards if I downgrade?",
    answer:
      "Nothing is deleted. Your dashboards and uploaded data stay safely in your account; anything beyond your new plan's limits simply becomes read-only until you upgrade again or remove it yourself.",
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-4 pb-24 pt-32 sm:px-6">
        {/* Intro */}
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Simple pricing, in shekels.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            Start free, see your data as a dashboard in seconds, and upgrade
            only when you need more room. While Tada is in beta, everything
            below is free.
          </p>
        </div>

        {/* Tiers */}
        <div className="mx-auto mt-16 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-[20px] bg-white p-8 ${
                tier.highlighted ? "shadow-md" : "shadow-sm"
              }`}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-accent)] px-4 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}

              <div className="flex items-center gap-2">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  {tier.name}
                </h2>
                {tier.comingSoon && (
                  <span className="rounded-full bg-[var(--color-accent-light)] px-2.5 py-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-[var(--color-accent)]">
                    Coming soon
                  </span>
                )}
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-4xl font-bold text-foreground">
                  {tier.price}
                </span>
                <span className="text-sm text-muted-foreground">
                  {tier.period}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {tier.description}
              </p>

              <ul className="mt-6 flex flex-1 flex-col gap-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" />
                    <span className="text-sm leading-6 text-foreground">
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href="/login"
                className={`mt-8 inline-flex h-11 items-center justify-center rounded-full px-6 text-sm font-semibold transition-colors ${
                  tier.highlighted
                    ? "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-secondary)]"
                    : "bg-[var(--color-accent-light)] text-[var(--color-accent)] hover:bg-[#d9e4f3]"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-24 max-w-3xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Billing questions
          </h2>
          <div className="mt-8 flex flex-col gap-4">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="rounded-[20px] bg-white p-6 shadow-sm sm:p-8"
              >
                <h3 className="font-display text-base font-semibold text-foreground">
                  {faq.question}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
