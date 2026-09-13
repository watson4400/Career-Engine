"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

export function FadeIn({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

export function PathDraw({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 320 80" fill="none" aria-hidden>
      <motion.path
        d="M8 58C40 58 48 18 80 18s40 40 72 40 40-36 72-36 36 38 72 38 24-22 40-22"
        stroke="var(--atlantic)"
        strokeWidth="2.2"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0.2 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.6, ease: "easeInOut" }}
      />
      {[8, 80, 152, 224, 280, 312].map((x, i) => (
        <motion.circle
          key={x}
          cx={x}
          cy={i % 2 === 0 ? 58 : i === 5 ? 36 : 18 + (i % 3) * 10}
          r="3.2"
          fill="var(--ochre)"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25 + i * 0.18, duration: 0.35 }}
        />
      ))}
    </svg>
  );
}
