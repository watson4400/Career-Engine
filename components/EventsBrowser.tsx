"use client";

import { useMemo, useState } from "react";
import { townEvents } from "@/content";
import { EventCard } from "@/components/EventCard";
import { FadeIn } from "@/components/Motion";
import { getEventTiming, sortEventsByRelevance } from "@/lib/events";

const filters = [
  { id: "relevant", label: "On the trail" },
  { id: "all", label: "Full calendar" },
] as const;

type FilterId = (typeof filters)[number]["id"];

export function EventsBrowser() {
  const [filter, setFilter] = useState<FilterId>("relevant");

  const sorted = useMemo(() => sortEventsByRelevance(townEvents), []);

  const visible = useMemo(() => {
    if (filter === "all") return sorted;
    return sorted.filter((event) => {
      const timing = getEventTiming(event);
      return timing === "happening" || timing === "upcoming" || timing === "later";
    });
  }, [filter, sorted]);

  const towns = useMemo(() => {
    const labels = [...new Set(visible.map((e) => e.townLabel))];
    return labels;
  }, [visible]);

  return (
    <div>
      <FadeIn>
        <p className="text-[0.7rem] uppercase tracking-[0.22em] text-ochre-deep">
          Along the Way
        </p>
        <h1 className="mt-3 font-display text-4xl text-granite sm:text-5xl">
          Town events
        </h1>
        <p className="mt-3 max-w-prose text-muted">
          Festivals, patron feasts, romerías, and food celebrations in the towns
          you walk through — sorted for what’s nearest on the calendar.
        </p>
        <div className="mt-6 flex gap-2">
          {filters.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                className={`focus-ring rounded-full px-4 py-2 text-sm transition ${
                  active
                    ? "bg-atlantic-deep text-shell"
                    : "bg-shell/70 text-muted hover:text-granite"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted">
          {visible.length} events · {towns.length} towns
        </p>
      </FadeIn>

      <div className="mt-4">
        {visible.map((event, i) => (
          <EventCard key={event.id} event={event} index={i} />
        ))}
      </div>
    </div>
  );
}
