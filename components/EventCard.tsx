"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { TownEvent } from "@/content";
import { getStopById } from "@/content";
import {
  getEventTiming,
  timingLabel,
  type EventTiming,
} from "@/lib/events";
import { eventKindLabels } from "@/lib/labels";

export function EventCard({
  event,
  index = 0,
  showTown = true,
}: {
  event: TownEvent;
  index?: number;
  showTown?: boolean;
}) {
  const timing = getEventTiming(event);
  const primaryStop = getStopById(event.stopIds[0]);

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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="text-[0.7rem] uppercase tracking-[0.18em] text-ochre-deep">
          {eventKindLabels[event.kind] ?? event.kind}
        </p>
        <TimingPill timing={timing} />
      </div>
      <h3 className="mt-2 font-display text-2xl text-granite">{event.title}</h3>
      {showTown ? (
        <p className="mt-1 text-sm text-atlantic">{event.townLabel}</p>
      ) : null}
      <p className="mt-1 text-sm text-muted">{event.whenLabel}</p>
      <p className="mt-3 max-w-prose text-[0.95rem] leading-relaxed text-muted">
        {event.summary}
      </p>
      <p className="mt-3 max-w-prose text-[0.95rem] leading-relaxed text-granite-soft">
        {event.body}
      </p>
      {event.practical ? (
        <p className="mt-3 max-w-prose border-l-2 border-atlantic/35 pl-3 text-sm leading-relaxed text-muted">
          {event.practical}
        </p>
      ) : null}
      {showTown && primaryStop ? (
        <Link
          href={`/stops/${primaryStop.slug}/`}
          className="focus-ring mt-4 inline-flex text-sm text-atlantic hover:text-atlantic-deep"
        >
          Open {primaryStop.name} →
        </Link>
      ) : null}
    </motion.article>
  );
}

function TimingPill({ timing }: { timing: EventTiming }) {
  const styles: Record<EventTiming, string> = {
    happening: "bg-atlantic/15 text-atlantic-deep",
    upcoming: "bg-ochre/25 text-ochre-deep",
    later: "bg-mist/80 text-muted",
    passed: "bg-transparent text-muted",
  };
  return (
    <span
      className={`rounded-md px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.14em] ${styles[timing]}`}
    >
      {timingLabel(timing)}
    </span>
  );
}
