import { tipSchema, type Tip } from "./schema";

const raw: Tip[] = [
  {
    id: "tip-credential-start",
    category: "credential",
    title: "Get your credencial in Ferrol",
    body: "Pick up a pilgrim credential at the tourist office or a local parish before leaving the Curuxeiras docks. From Ferrol you already cover the final 100 km for the Compostela — collect two sellos per walking day.",
    stageIds: ["stage-1"],
  },
  {
    id: "tip-sellos-rhythm",
    category: "credential",
    title: "Stamp early and often",
    body: "Ask for sellos at churches, albergues, bars, and tourist offices. After Betanzos, villages quiet in the afternoon — stamp whenever a door is open.",
  },
  {
    id: "tip-rain-atlantic",
    category: "weather",
    title: "Atlantic weather packs light but wet",
    body: "A soft shell and quick-dry layers beat a heavy parka. A compact rain skirt keeps mud off after Pontedeume’s wooded climbs.",
  },
  {
    id: "tip-footing-estuaries",
    category: "footing",
    title: "Watch the estuary edges",
    body: "Early stages hug the ría. Promenades can be slick with sea mist. Soft trail shoes with grip beat stiff boots on wet granite.",
    stageIds: ["stage-1", "stage-2"],
  },
  {
    id: "tip-betanzos-climb",
    category: "footing",
    title: "Respect the Betanzos–Bruma day",
    body: "The longest, hilliest classic stage. Start early, carry extra water, and break at Presedo. Shorten your stride on the climb out of Betanzos.",
    stageIds: ["stage-4"],
  },
  {
    id: "tip-food-menu",
    category: "food",
    title: "Menú del día is your friend",
    body: "Look for the pilgrim or weekday lunch set. In Betanzos, try the famously soft tortilla — thick, almost custardy, and worth the queue.",
  },
  {
    id: "tip-food-hydration",
    category: "food",
    title: "Fill bottles at every fuente",
    body: "Marked fountains are generally fine; if a spout looks neglected, wait for the next bar. Carry at least a litre on inland stages.",
  },
  {
    id: "tip-albergue",
    category: "etiquette",
    title: "Albergue quiet hours are sacred",
    body: "Pack at night, not at 5 a.m. Use a red headlamp if you must move early. Rinse boots outside and never drip gear over another bunk.",
  },
  {
    id: "tip-poles",
    category: "gear",
    title: "Poles earn their keep after Betanzos",
    body: "Trekking poles spare knees on descents and the Santiago approach. Collapsible poles tuck away for café stops.",
    stageIds: ["stage-4", "stage-5", "stage-6"],
  },
  {
    id: "tip-santiago-timing",
    category: "etiquette",
    title: "Time your arrival for the cathedral",
    body: "Check pilgrim mass times the evening before in Sigüeiro. Enter via the old town so your first sight of the towers feels earned.",
    stageIds: ["stage-6"],
  },
  {
    id: "tip-blisters",
    category: "gear",
    title: "Tape hotspots before they bloom",
    body: "At the first hot spot, stop. Clean, dry, and tape. Dry socks at lunch prevent most afternoon blisters on humid estuary days.",
  },
  {
    id: "tip-arrows",
    category: "footing",
    title: "Trust arrows, verify junctions",
    body: "Yellow arrows and scallop tiles mark the way. Near Ferrol roads and Santiago business parks, glance at your stage notes when junctions multiply.",
  },
];

export const tips: Tip[] = raw.map((t) => tipSchema.parse(t));

export function getTipById(id: string) {
  return tips.find((t) => t.id === id);
}

export function getTipsByCategory(category: Tip["category"]) {
  return tips.filter((t) => t.category === category);
}

export function getTipsForStage(stageId: string) {
  return tips.filter((t) => !t.stageIds?.length || t.stageIds.includes(stageId));
}
