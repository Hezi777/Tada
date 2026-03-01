import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const faqs = [
    {
        question: "What file formats does TADA support?",
        answer: "Tada currently supports CSV and Excel (.xlsx, .xls) files. Just drag and drop your file, and we'll automatically parse the structure, detect columns, and prepare it for instant visualization.",
    },
    {
        question: "Is my data private and secure?",
        answer: "Absolutely. We rely on enterprise-grade infrastructure. Your uploaded datasets are stored securely and never used to train global AI models without your explicit consent.",
    },
    {
        question: "How long does it take to generate a dashboard?",
        answer: "Usually less than 30 seconds. Once your file is uploaded, our AI agents analyze the schema and instantly generate a suite of optimal charts and insights without any manual configuration.",
    },
    {
        question: "Can I ask questions about my data?",
        answer: "Yes! Every generated dashboard includes an AI copilot. You can ask complex analytical questions in plain English (e.g., 'Show me sales by region for the last 30 days'), and Tada will instantly draw the chart for you.",
    },
    {
        question: "Is it really free?",
        answer: "Tada is currently in beta and completely free to use. We want to hear your feedback to help shape the future of instant data insights.",
    },
];

export function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    return (
        <section className="relative px-4 py-24 sm:px-6">
            <div className="container max-w-3xl">
                <div className="mb-14 text-center">
                    <div className="eyebrow mb-5">FAQ</div>
                    <h2 className="text-4xl text-foreground sm:text-5xl">Common questions</h2>
                </div>

                <div className="flex flex-col gap-4">
                    {faqs.map((faq, index) => {
                        const isOpen = openIndex === index;
                        return (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                                className={`group rounded-2xl border transition-all duration-300 ${isOpen
                                        ? "border-primary/20 bg-white shadow-md"
                                        : "border-transparent bg-white/40 hover:bg-white/60 hover:shadow-sm"
                                    }`}
                            >
                                <button
                                    onClick={() => setOpenIndex(isOpen ? null : index)}
                                    className="flex w-full items-center justify-between p-6 text-left outline-none"
                                >
                                    <span className={`font-display text-lg font-semibold transition-colors ${isOpen ? "text-primary" : "text-foreground group-hover:text-primary"}`}>
                                        {faq.question}
                                    </span>
                                    <div className={`ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all duration-300 ${isOpen ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-500 group-hover:bg-primary/5 group-hover:text-primary"}`}>
                                        <ChevronDown className={`h-5 w-5 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                                    </div>
                                </button>
                                <div
                                    className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                                        }`}
                                >
                                    <p className="px-6 pb-6 text-slate-600 leading-relaxed">
                                        {faq.answer}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
