import type { TownEvent } from "@/content";

export type EventTiming = "happening" | "upcoming" | "later" | "passed";

function parseDay(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function todayUtcDay(now = new Date()): number {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

export function getEventTiming(
  event: TownEvent,
  now = new Date(),
): EventTiming {
  const today = todayUtcDay(now);
  const start = parseDay(event.startDate);
  const end = parseDay(event.endDate);
  if (today >= start && today <= end) return "happening";
  if (today < start) {
    const days = (start - today) / 86_400_000;
    return days <= 21 ? "upcoming" : "later";
  }
  return "passed";
}

export function sortEventsByRelevance(
  list: TownEvent[],
  now = new Date(),
): TownEvent[] {
  const rank: Record<EventTiming, number> = {
    happening: 0,
    upcoming: 1,
    later: 2,
    passed: 3,
  };
  return [...list].sort((a, b) => {
    const ta = getEventTiming(a, now);
    const tb = getEventTiming(b, now);
    if (rank[ta] !== rank[tb]) return rank[ta] - rank[tb];
    return parseDay(a.startDate) - parseDay(b.startDate);
  });
}

export function timingLabel(timing: EventTiming): string {
  switch (timing) {
    case "happening":
      return "Happening now";
    case "upcoming":
      return "Coming up";
    case "later":
      return "Later this season";
    case "passed":
      return "Earlier this year";
  }
}
