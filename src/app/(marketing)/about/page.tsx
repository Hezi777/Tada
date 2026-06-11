import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenCheck, Globe2, Languages } from "lucide-react";
import { Header } from "@/app/(marketing)/_components/Header";
import { Footer } from "@/app/(marketing)/_components/Footer";

export const metadata: Metadata = {
  title: "About — Tada",
  description:
    "Tada is a small team in Israel building AI dashboards for small businesses — grounded generation, Hebrew-first data handling, and honest answers from your own files.",
};

const differences = [
  {
    icon: BookOpenCheck,
    title: "Grounded, not guessed",
    description:
      "Every dashboard Tada generates is checked against a library of BI best-practice rules and retrieved context from your own data. Charts are validated before they ever reach your screen — if the AI cannot justify a chart, it does not draw one.",
  },
  {
    icon: Languages,
    title: "Hebrew first",
    description:
      "Hebrew column names, right-to-left text, and mixed-language files are not edge cases for us — they are the starting point. You can chat with your data in Hebrew or English and switch mid-conversation.",
  },
  {
    icon: Globe2,
    title: "Local by default",
    description:
      "Shekel amounts render as ₪, dates read as DD/MM/YYYY, and your numbers look the way you and your accountant actually write them. No locale settings to hunt for.",
  },
];

const values = [
  {
    title: "Honesty over hype",
    description:
      "AI makes mistakes, and we say so — in the product, not just the fine print. Tada shows its work so you can verify a number before you act on it.",
  },
  {
    title: "Calm software",
    description:
      "No dashboards-of-dashboards, no notification storms. You upload a file, you get a clear answer, you get back to running your business.",
  },
  {
    title: "Your data is yours",
    description:
      "You own everything you upload. We never sell your data, we strip personal columns out of AI prompts, and deleting your account deletes your data.",
  },
  {
    title: "Small by design",
    description:
      "We are a small team building for small businesses. That keeps us close to the people who use Tada and ruthless about what actually matters.",
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-4 pb-24 pt-32 sm:px-6">
        {/* Story */}
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Every business deserves answers from its own data.
          </h1>
          <div className="mt-8 flex flex-col gap-5 text-lg leading-8 text-muted-foreground">
            <p>
              Tada started with a familiar scene: a small business owner in
              Israel, a folder full of spreadsheets, and a question that should
              have been simple — &ldquo;how did we actually do last
              month?&rdquo; The data was all there. The answer was not.
            </p>
            <p>
              Big companies solve this with analysts and BI teams. Small
              businesses get told to learn a dashboard tool, hire a consultant,
              or just keep squinting at Excel. We thought that was unfair, so
              we built the tool we wished existed: upload a CSV, Excel, or PDF
              file, and get a real dashboard — with charts chosen by
              best-practice rules, not vibes — in seconds. Then ask follow-up
              questions in plain Hebrew or English and watch the answers
              appear.
            </p>
            <p>
              We are a small team based in Israel, and we build Tada for the
              businesses around us first: the ones invoicing in shekels,
              writing dates as DD/MM/YYYY, and keeping their books in Hebrew,
              English, or both at once.
            </p>
          </div>
        </div>

        {/* What makes Tada different */}
        <div className="mx-auto mt-24 max-w-6xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            What makes Tada different
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {differences.map((item) => (
              <div
                key={item.title}
                className="rounded-[20px] bg-white p-8 shadow-sm"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent-light)]">
                  <item.icon className="h-6 w-6 text-[var(--color-accent)]" />
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Values */}
        <div className="mx-auto mt-24 max-w-6xl">
          <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
            What we believe
          </h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-[20px] bg-white p-8 shadow-sm"
              >
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {value.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  {value.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mx-auto mt-24 max-w-3xl rounded-[20px] bg-white p-10 text-center shadow-sm">
          <h2 className="font-display text-2xl font-bold text-foreground">
            See your own data, today.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-muted-foreground">
            Upload a file and get your first dashboard in under a minute. Free
            while we are in beta.
          </p>
          <Link
            href="/login"
            className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-accent)] px-7 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-secondary)]"
          >
            Start free
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
