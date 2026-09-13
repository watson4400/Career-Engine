import { stageSchema, type Stage } from "./schema";

const raw: Stage[] = [
  {
    id: "stage-1",
    slug: "ferrol-neda",
    number: 1,
    from: "Ferrol",
    to: "Neda",
    distanceKm: 15.4,
    difficulty: "gentle",
    elevationFeel: "Mostly level along the ría — an opening gift.",
    narrative:
      "Begin at the Curuxeiras docks, where medieval ships once offered pilgrims to Galicia’s shore. Walk the Mariña promenade past San Francisco and through the neoclassical order of A Madalena. The first day stays close to estuary light, easing you into the rhythm of arrows, shells, and quiet kilometres toward Neda.",
    highlight: "Start where the sea hands you to the road.",
    stopIds: [
      "stop-curuxeiras",
      "stop-san-francisco",
      "stop-madalena",
      "stop-neda",
    ],
    tipIds: ["tip-credential-start", "tip-footing-estuaries"],
    nuggetIds: [
      "nugget-english-way",
      "nugget-ferrol-arsenal",
      "nugget-curuxeiras",
    ],
  },
  {
    id: "stage-2",
    slug: "neda-mino",
    number: 2,
    from: "Neda",
    to: "Miño",
    distanceKm: 22.1,
    difficulty: "moderate",
    elevationFeel: "Rolling coastal country with a few honest rises.",
    narrative:
      "Leave the Ferrol estuary’s inner calm for wooded lanes and the storied town of Pontedeume — bridge, river, and Andrade stone. Continue past castle silhouettes and the Baxoi crossing toward Miño, where marshes open under a wider sky. This is the day the Camino Inglés finds its coastal voice.",
    highlight: "Pontedeume’s bridge-town beauty.",
    stopIds: [
      "stop-pontedeume",
      "stop-castelo-andrade",
      "stop-baxoi",
      "stop-mino",
    ],
    tipIds: ["tip-footing-estuaries", "tip-rain-atlantic"],
    nuggetIds: ["nugget-andrade", "nugget-ponte-deume"],
  },
  {
    id: "stage-3",
    slug: "mino-betanzos",
    number: 3,
    from: "Miño",
    to: "Betanzos",
    distanceKm: 10.5,
    difficulty: "gentle",
    elevationFeel: "A shorter gift before the hills — keep it unhurried.",
    narrative:
      "A compact stage carries you from coastal Miño to the old bridge of Betanzos. Arrive with time to spare: Gothic churches, knightly plazas, and a tortilla worth arguing about wait inside the walls. Rest here. Tomorrow asks more of you.",
    highlight: "Betanzos — City of Knights.",
    stopIds: ["stop-ponte-vella", "stop-betanzos"],
    tipIds: ["tip-food-menu", "tip-albergue"],
    nuggetIds: ["nugget-betanzos-knights", "nugget-betanzos-tortilla"],
  },
  {
    id: "stage-4",
    slug: "betanzos-bruma",
    number: 4,
    from: "Betanzos",
    to: "Bruma",
    distanceKm: 24.5,
    difficulty: "demanding",
    elevationFeel: "The climb out of Betanzos sets the tone — long and hilly.",
    narrative:
      "The classic day that tests resolve. Ascend from Betanzos into green interior Galicia, pausing at Presedo’s sanctuary, then press on to Bruma where the A Coruña branch joins your path. Two Caminos become one; tired legs earn the meeting.",
    highlight: "Meet the Coruña pilgrims at Bruma.",
    stopIds: ["stop-presedo", "stop-bruma"],
    tipIds: ["tip-betanzos-climb", "tip-food-hydration", "tip-poles"],
    nuggetIds: ["nugget-presedo", "nugget-bruma-meeting"],
  },
  {
    id: "stage-5",
    slug: "bruma-sigueiro",
    number: 5,
    from: "Bruma",
    to: "Sigüeiro",
    distanceKm: 24.2,
    difficulty: "moderate",
    elevationFeel: "Inland undulation through oak, lane, and parish stone.",
    narrative:
      "Shared path now. Cruceiros guide you through villages and woodland toward Poulo and the Tambre crossing into Sigüeiro. Compostela is close enough to taste — resist inventing tomorrow’s emotions today. Walk this stage cleanly.",
    highlight: "Cross the Tambre into Santiago’s municipality.",
    stopIds: ["stop-poulo", "stop-sigueiro"],
    tipIds: ["tip-poles", "tip-arrows"],
    nuggetIds: ["nugget-tambre", "nugget-bruma-meeting"],
  },
  {
    id: "stage-6",
    slug: "sigueiro-santiago",
    number: 6,
    from: "Sigüeiro",
    to: "Santiago de Compostela",
    distanceKm: 16.1,
    difficulty: "moderate",
    elevationFeel: "Urban fringe, then the old town’s final climb of the heart.",
    narrative:
      "The last day. Pass business parks and the memory of Meixonfrío’s inn, salute the Cruceiro da Coruña, and thread into streets that suddenly know why you came. When the Obradoiro opens, you are no longer going to Santiago. You are there.",
    highlight: "Arrive at the Catedral de Santiago.",
    stopIds: ["stop-cruceiro-coruna", "stop-cathedral"],
    tipIds: ["tip-santiago-timing", "tip-sellos-rhythm"],
    nuggetIds: [
      "nugget-meixonfrio",
      "nugget-compostela",
      "nugget-botafumeiro",
    ],
  },
];

export const stages: Stage[] = raw.map((s) => stageSchema.parse(s));

export const TOTAL_DISTANCE_KM = Number(
  stages.reduce((sum, s) => sum + s.distanceKm, 0).toFixed(1),
);

export function getStageBySlug(slug: string) {
  return stages.find((s) => s.slug === slug);
}

export function getStageById(id: string) {
  return stages.find((s) => s.id === id);
}
