"use client";

import { motion } from "framer-motion";
import type { Nugget } from "@/content";

export function NuggetCard({
  nugget,
  index = 0,
}: {
  nugget: Nugget;
  index?: number;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        duration: 0.5,
        delay: Math.min(index * 0.06, 0.3),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="border-b border-line py-6"
    >
      {nugget.era ? (
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-ochre-deep">
          {nugget.era}
        </p>
      ) : null}
      <h3 className="mt-2 font-display text-2xl text-granite">{nugget.title}</h3>
      <p className="mt-3 max-w-prose text-[0.95rem] leading-relaxed text-muted">
        {nugget.body}
      </p>
    </motion.article>
  );
}
