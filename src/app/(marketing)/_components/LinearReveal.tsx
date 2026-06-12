"use client";

import { useMemo, useRef, type CSSProperties, type JSX } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

interface LinearRevealProps {
  text: string;
  className?: string;
  colorClass?: string;
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
  style?: CSSProperties;
}

const container = {
  hidden: {},
  visible: (delay: number) => ({
    transition: { staggerChildren: 0.05, delayChildren: delay },
  }),
};

const child = {
  hidden: { opacity: 0, y: 10, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const childReduced = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4 } },
};

export function LinearReveal({
  text,
  className,
  colorClass,
  delay = 0,
  as = "span",
  style,
}: LinearRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const isInView = useInView(ref, { once: true });
  const shouldReduceMotion = useReducedMotion();

  const MotionTag = useMemo(
    () => motion.create(as) as unknown as typeof motion.span,
    [as],
  );

  return (
    <MotionTag
      ref={ref}
      className={className}
      style={style}
      variants={container}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      custom={delay}
    >
      {text.split("").map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          className={`inline-block ${colorClass ?? ""}`}
          variants={shouldReduceMotion ? childReduced : child}
        >
          {char === " " ? " " : char}
        </motion.span>
      ))}
    </MotionTag>
  );
}
