import { townEvents } from "../content/events.ts";
import { getEventTiming, sortEventsByRelevance } from "../lib/events.ts";

const now = new Date("2026-09-14T12:00:00Z");
const sorted = sortEventsByRelevance(townEvents, now);

const byTown = new Map();
for (const e of townEvents) {
  const list = byTown.get(e.townLabel) ?? [];
  list.push(e.title);
  byTown.set(e.townLabel, list);
}

console.log("Towns covered:", byTown.size);
for (const [town, titles] of [...byTown.entries()].sort()) {
  console.log(`- ${town}: ${titles.length} → ${titles.join("; ")}`);
}

console.log("\nTiming for 2026-09-14:");
for (const e of sorted) {
  console.log(
    `${getEventTiming(e, now).padEnd(10)} ${e.townLabel.padEnd(28)} ${e.title} (${e.whenLabel})`,
  );
}

const happening = sorted.filter((e) => getEventTiming(e, now) === "happening");
const upcoming = sorted.filter((e) => getEventTiming(e, now) === "upcoming");
if (happening.length < 1) {
  throw new Error("Expected at least one happening event mid-September");
}
if (!upcoming.some((e) => e.slug === "compostela-street")) {
  throw new Error("Compostela Street should be upcoming on Sept 14");
}
if (!upcoming.some((e) => e.slug === "mare-festival")) {
  throw new Error("Maré should be upcoming on Sept 14");
}
console.log("\nAccuracy checks passed.");
