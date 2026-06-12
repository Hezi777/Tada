"use client";

import { useRef, type JSX } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "framer-motion";

interface LinearRevealProps {
  text: string;
  className?: string;
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
}

/** Reveals text character-by-character with a staggered blur-up as it enters view. */
export function LinearReveal({
  text,
  className = "",
  delay = 0,
  as = "div",
}: LinearRevealProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();

  const container: Variants = {
    hidden: { opacity: reduce ? 1 : 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: reduce ? 0 : 0.05, delayChildren: delay },
    },
  };
  const child: Variants = {
    hidden: reduce
      ? { opacity: 1 }
      : { opacity: 0, y: 12, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
    },
  };

  const MotionTag = motion[as as keyof typeof motion] as typeof motion.div;

  return (
    <MotionTag
      ref={ref as React.RefObject<HTMLDivElement>}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={container}
      className={className}
    >
      {text.split("").map((ch, i) => (
        <motion.span key={i} variants={child} className="inline-block">
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </MotionTag>
  );
}
