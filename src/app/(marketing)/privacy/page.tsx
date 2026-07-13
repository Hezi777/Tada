import type { Metadata } from "next";
import { Header } from "@/app/(marketing)/_components/Header";
import { Footer } from "@/app/(marketing)/_components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy - Tada",
  description:
    "How Tada collects, stores, and protects your data: what we keep, how AI processing works, and how to delete everything.",
};

type Section = {
  heading: string;
  paragraphs: string[];
  list?: string[];
};

const sections: Section[] = [
  {
    heading: "What we collect",
    paragraphs: ["We collect only what we need to run Tada for you:"],
    list: [
      "Account information - the email address you sign up with, and your authentication details.",
      "Uploaded datasets - the CSV, Excel, and PDF files you upload, and the dashboards generated from them.",
      "Usage data - basic product events such as uploads, dashboard generations, and chat messages, used to keep the service reliable and improve it.",
    ],
  },
  {
    heading: "Where your data is stored",
    paragraphs: [
      "Your account data, uploaded files, and dashboards are stored in Supabase, our hosting and database provider. Data is encrypted at rest and in transit. Access to production data is restricted to the small number of team members who operate the service, and only for support and maintenance purposes.",
    ],
  },
  {
    heading: "How AI processing works",
    paragraphs: [
      "Tada uses large language models to generate dashboards and answer questions about your data. When you upload a file or ask a question, relevant portions of your data are sent to Groq's API for processing. Groq processes this data to generate a response and does not use it to train models.",
      "Before anything is sent to the AI, Tada scans your dataset for columns that look like personal information - names, phone numbers, email addresses, ID numbers, and similar fields. Detected PII columns are excluded from AI prompts and from search indexes. They stay in your stored dataset, but they are not shared with the model.",
    ],
  },
  {
    heading: "Retention and deletion",
    paragraphs: [
      "We keep your data for as long as you have an account, so your dashboards keep working. You can delete individual datasets and dashboards at any time from within the app.",
      "If you delete your account, your uploaded files, dashboards, chat history, and account information are removed from our systems. Residual copies in encrypted backups are purged on the backup rotation schedule, within 30 days.",
    ],
  },
  {
    heading: "Cookies",
    paragraphs: [
      "Tada uses cookies only to keep you signed in - a secure authentication session cookie set when you log in. We do not use advertising cookies, third-party trackers, or cross-site analytics cookies.",
    ],
  },
  {
    heading: "What we never do",
    paragraphs: [
      "We do not sell your data. We do not share your datasets with advertisers. We do not use your data to train AI models. Your uploads are yours, and they exist in Tada for exactly one purpose: showing you your own answers.",
    ],
  },
  {
    heading: "Changes to this policy",
    paragraphs: [
      "If we make meaningful changes to this policy, we will update this page and note the new date below. For significant changes - anything that affects how your data is processed - we will also notify you by email before the change takes effect.",
    ],
  },
  {
    heading: "Contact us",
    paragraphs: [
      "Questions about your data or this policy? Email us at hello@tada.app and a human will reply.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-4 pb-24 pt-32 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated: June 2026
          </p>

          <div className="mt-10 rounded-[20px] bg-white p-8 shadow-sm sm:p-12">
            <p className="text-base leading-8 text-muted-foreground">
              Tada turns the files you upload into dashboards and answers. That
              only works if you can trust us with your data, so this policy is
              written to be read - it explains what we collect, where it lives,
              what the AI sees, and how to make us delete all of it.
            </p>

            {sections.map((section) => (
              <section key={section.heading} className="mt-10">
                <h2 className="font-display text-xl font-semibold text-foreground">
                  {section.heading}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={paragraph}
                    className="mt-3 text-base leading-8 text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
                {section.list && (
                  <ul className="mt-3 flex list-disc flex-col gap-2 pl-6">
                    {section.list.map((item) => (
                      <li
                        key={item}
                        className="text-base leading-8 text-muted-foreground"
                      >
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
