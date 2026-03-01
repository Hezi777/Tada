"use client";

import { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { Sparkles, TrendingUp, Zap } from "lucide-react";

export function AnimatedDashboardMockup() {
    const [mounted, setMounted] = useState(false);
    const [count, setCount] = useState(0);

    useEffect(() => {
        setMounted(true);

        // Animate the KPI counter
        let startTimestamp: number;
        const duration = 2000;
        const target = 148;

        const step = (timestamp: number) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);

            // Use easeOutQuart for smooth deceleration
            const easeProgress = 1 - Math.pow(1 - progress, 4);
            setCount(Math.floor(easeProgress * target));

            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };

        window.requestAnimationFrame(step);
    }, []);

    if (!mounted) return null;

    return (
        <div className="relative w-full max-w-[500px] animate-bob">
            {/* Glow behind the mockup */}
            <div className="absolute -inset-4 rounded-[2.5rem] bg-primary/20 blur-3xl" />

            {/* Main Glass Panel */}
            <div className="relative flex flex-col gap-4 rounded-[2rem] border border-white/60 bg-white/40 p-5 shadow-2xl backdrop-blur-xl">

                {/* Top KPI row */}
                <div className="flex gap-4">
                    <div className="flex-1 rounded-[1.25rem] border border-white/80 bg-white/70 p-4 shadow-sm">
                        <p className="text-[0.65rem] font-bold uppercase tracking-widest text-primary/70">
                            Q3 Forecast
                        </p>
                        <div className="mt-1 flex items-baseline gap-1">
                            <span className="text-3xl font-extrabold text-slate-800">${count}k</span>
                            <span className="flex items-center text-xs font-semibold text-emerald-500">
                                <TrendingUp className="mr-0.5 h-3 w-3" />
                                +18%
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 rounded-[1.25rem] border border-white/80 bg-primary/5 p-4 shadow-sm">
                        <p className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-widest text-primary">
                            <Sparkles className="h-3 w-3" />
                            Insight
                        </p>
                        <div className="mt-2 w-full">
                            <p className="animate-typing overflow-hidden whitespace-nowrap border-r-2 border-primary pr-2 text-xs font-medium text-slate-700">
                                Growth is accelerating in EMEA.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Chart Window */}
                <div className="relative h-48 w-full overflow-hidden rounded-[1.5rem] border border-white/80 bg-white/80 p-4 shadow-sm">
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-400">
                        Revenue Trajectory
                    </p>

                    <div className="absolute bottom-4 left-4 right-4 top-10">
                        {/* Grid lines */}
                        <div className="absolute bottom-0 left-0 right-0 top-0 flex flex-col justify-between border-b border-slate-100">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className="w-full border-t border-slate-100/60" />
                            ))}
                        </div>

                        {/* SVG Line Chart */}
                        <svg
                            className="absolute inset-0 h-full w-full overflow-visible"
                            viewBox="0 0 400 120"
                            preserveAspectRatio="none"
                        >
                            <defs>
                                <linearGradient id="line-gradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.2" />
                                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                                </linearGradient>
                            </defs>

                            {/* Area under the curve */}
                            <motion.path
                                d="M 0 100 C 50 100, 80 80, 120 70 C 160 60, 200 85, 240 50 C 280 15, 320 30, 400 10 L 400 120 L 0 120 Z"
                                fill="url(#line-gradient)"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1, delay: 0.5 }}
                            />

                            {/* The Line */}
                            <motion.path
                                d="M 0 100 C 50 100, 80 80, 120 70 C 160 60, 200 85, 240 50 C 280 15, 320 30, 400 10"
                                fill="none"
                                stroke="#3B82F6"
                                strokeWidth="4"
                                strokeLinecap="round"
                                initial={{ pathLength: 0 }}
                                animate={{ pathLength: 1 }}
                                transition={{ duration: 2, ease: "easeOut" }}
                            />

                            {/* Data point dot */}
                            <motion.circle
                                cx="400"
                                cy="10"
                                r="6"
                                fill="white"
                                stroke="#3B82F6"
                                strokeWidth="3"
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.5, delay: 1.8, type: "spring" }}
                            />
                        </svg>
                    </div>
                </div>

                {/* Fake Prompt Window */}
                <div className="flex items-center gap-3 rounded-[1.25rem] border border-white/60 bg-white/50 px-4 py-3 shadow-inner">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white">
                        <Zap className="h-3 w-3" />
                    </div>
                    <p className="text-xs font-medium text-slate-500">
                        Show me revenue vs trailing 30 days...
                    </p>
                </div>

            </div>
        </div>
    );
}
