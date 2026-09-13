import { stopSchema, type Stop } from "./schema";

const raw: Stop[] = [
  {
    id: "stop-curuxeiras",
    slug: "curuxeiras",
    name: "Docks of Curuxeiras",
    kind: "port",
    stageId: "stage-1",
    summary: "The medieval quays where the English Way begins — sea meeting stone.",
    atmosphere:
      "Morning mist lifts off the ría. Gulls argue over the harbour. Yellow arrows wait just beyond the first café tables.",
    history:
      "Curuxeiras was Ferrol’s medieval harbour long before the 18th-century arsenal remade the city. English and Irish ships once put pilgrims ashore here for the walk to Compostela.",
    practical:
      "Photo the harbour, check your credential, and fill water before the promenade toward A Madalena.",
    nuggetIds: ["nugget-curuxeiras", "nugget-english-way"],
  },
  {
    id: "stop-san-francisco",
    slug: "igrexa-san-francisco",
    name: "Igrexa de San Francisco",
    kind: "church",
    stageId: "stage-1",
    summary: "A landmark between Ferrol’s old quarter and neoclassical Madalena.",
    atmosphere: "Quiet stone after the harbour bustle — a first sacred pause on the path.",
    history:
      "The church sits on the seam between medieval Ferrol and the planned city that followed. Pilgrims pass it while the route still feels urban.",
    practical: "Ask politely for a sello if the church is open.",
    nuggetIds: [],
  },
  {
    id: "stop-madalena",
    slug: "a-madalena",
    name: "A Madalena",
    kind: "town",
    stageId: "stage-1",
    summary: "Ferrol’s Enlightenment quarter — a neoclassical grid born for the navy.",
    atmosphere:
      "Straight streets, measured plazas, and stone façades that feel more planned city than fishing port.",
    history:
      "Built to house arsenal workers under Fernando VI, A Madalena is a textbook of Spanish Enlightenment urbanism.",
    practical: "Good for a last urban coffee and a sello before the route softens toward Neda.",
    nuggetIds: ["nugget-ferrol-arsenal"],
  },
  {
    id: "stop-neda",
    slug: "neda",
    name: "Neda",
    kind: "town",
    stageId: "stage-1",
    summary: "End of the short opening stage — estuary light and small-town calm.",
    atmosphere: "The ría still close, the day’s walk short enough to arrive with curiosity left over.",
    history:
      "Neda grew along the Ferrol estuary corridors that linked naval Ferrol to inland Galicia. For many pilgrims it is the first overnight of the Inglés.",
    practical: "Confirm albergue or pensión beds early in peak season; stage two is longer.",
    nuggetIds: [],
  },
  {
    id: "stop-pontedeume",
    slug: "pontedeume",
    name: "Pontedeume",
    kind: "town",
    stageId: "stage-2",
    summary: "Bridge-town of the Eume — Andrade stone and river light.",
    atmosphere:
      "Slate roofs, a river that means business, and a historic centre that rewards a slow wander.",
    history:
      "Named for its bridge over the Eume, Pontedeume flourished under the Andrade family. It remains one of the Camino Inglés’s most photogenic towns.",
    practical: "Climb to viewpoints if legs allow; stock snacks before continuing toward Miño.",
    nuggetIds: ["nugget-andrade", "nugget-ponte-deume"],
  },
  {
    id: "stop-castelo-andrade",
    slug: "castelo-dos-andrade",
    name: "Castelo dos Andrade",
    kind: "castle",
    stageId: "stage-2",
    summary: "The Andrade stronghold watching over the Pontedeume approaches.",
    atmosphere: "Wind off the estuary, granite walls, and a sense of medieval command.",
    history:
      "The Andrade lords projected power across this coast. Their castle and tower are the stone autobiography of a family that shaped pilgrim and trade routes alike.",
    practical: "Detour time varies — weigh legs and daylight before a full visit.",
    nuggetIds: ["nugget-andrade"],
  },
  {
    id: "stop-baxoi",
    slug: "ponte-baxoi",
    name: "Ponte Baxoi",
    kind: "bridge",
    stageId: "stage-2",
    summary: "A graceful crossing on the coastal approach toward Miño.",
    atmosphere: "Water, reeds, and the soft click of poles on timber or stone.",
    history:
      "Small bridges like Baxoi are the unnoticed infrastructure of pilgrimage — places where routes stayed passable when weather turned.",
    practical: "Good pause for photos; surfaces can be slick after rain.",
    nuggetIds: [],
  },
  {
    id: "stop-mino",
    slug: "mino",
    name: "Miño",
    kind: "town",
    stageId: "stage-2",
    summary: "Coastal town at the mouth of the Lambre — marshes and wide sky.",
    atmosphere: "Sea air again after river valleys; room to breathe before Betanzos.",
    history:
      "Miño sits where river and ría trade stories. The municipal albergue near the marshes is known for its setting beside an ancient castro landscape.",
    practical: "Beach and marsh walks are tempting — save legs if tomorrow is Betanzos day.",
    nuggetIds: [],
  },
  {
    id: "stop-ponte-vella",
    slug: "ponte-vella-betanzos",
    name: "Ponte Vella",
    kind: "bridge",
    stageId: "stage-3",
    summary: "The old bridge greeting pilgrims into Betanzos.",
    atmosphere: "River below, old town rising — a threshold you feel in your feet.",
    history:
      "Arriving by the old bridge is the traditional entry into the historic core, a sequence of water then stone then plaza.",
    practical: "Look up as you cross — the skyline tells you why this town mattered.",
    nuggetIds: [],
  },
  {
    id: "stop-betanzos",
    slug: "betanzos",
    name: "Betanzos",
    kind: "town",
    stageId: "stage-3",
    summary: "Cidade dos Cabaleiros — Gothic churches and noble streets.",
    atmosphere:
      "Old-town density, café chatter, and the feeling that history never really left the plazas.",
    history:
      "One of Galicia’s historic capitals, Betanzos concentrates Gothic architecture and knightly legend. It is the cultural heart of the mid-Camino Inglés.",
    practical:
      "Eat well here and rest. The next classic stage toward Bruma is the hardest of the route.",
    nuggetIds: ["nugget-betanzos-knights", "nugget-betanzos-tortilla"],
  },
  {
    id: "stop-presedo",
    slug: "presedo",
    name: "Presedo",
    kind: "sanctuary",
    stageId: "stage-4",
    summary: "Hillside sanctuary of Nosa Señora da Saleta — a mercy stop on a long day.",
    atmosphere: "Quiet parish air after climbing. Green slopes, simple devotion, deep breath.",
    history:
      "The sanctuary and its small municipal albergue form a pastoral island on the Betanzos–Bruma stage.",
    practical: "Ideal mid-stage reset: water, shade, and a moment without hurry.",
    nuggetIds: ["nugget-presedo"],
  },
  {
    id: "stop-bruma",
    slug: "bruma",
    name: "Bruma",
    kind: "town",
    stageId: "stage-4",
    summary: "Junction of the Ferrol and A Coruña branches of the English Way.",
    atmosphere: "A small place with outsized route meaning — two pilgrim streams become one.",
    history:
      "From Bruma onward, walkers from Ferrol and A Coruña share the path to Santiago.",
    practical: "Albergue beds can fill when both branches arrive together — call ahead in busy months.",
    nuggetIds: ["nugget-bruma-meeting"],
  },
  {
    id: "stop-poulo",
    slug: "poulo",
    name: "San Xiao de Poulo",
    kind: "church",
    stageId: "stage-5",
    summary: "Parish stone among oaks and country lanes inland of Bruma.",
    atmosphere: "Birdsong, cruceiros, and the soft monotony of good walking.",
    history:
      "Rural churches like San Xiao de Poulo kept the inland path spiritually marked when the coast fell behind.",
    practical: "Shade is patchy — keep sipping even when the day feels cool.",
    nuggetIds: [],
  },
  {
    id: "stop-sigueiro",
    slug: "sigueiro",
    name: "Sigüeiro",
    kind: "town",
    stageId: "stage-5",
    summary: "Last major overnight before Compostela — Tambre bridge and pilgrim buzz.",
    atmosphere: "Anticipation in the cafés. Tomorrow is Santiago.",
    history:
      "Crossing into the Santiago municipality via the Tambre, Sigüeiro has long been the staging town for the final approach.",
    practical: "Rest well, prep a light daypack, and check cathedral mass times.",
    nuggetIds: ["nugget-tambre"],
  },
  {
    id: "stop-cruceiro-coruna",
    slug: "cruceiro-da-coruna",
    name: "Cruceiro da Coruña",
    kind: "landmark",
    stageId: "stage-6",
    summary: "Stone cross near old Meixonfrío — threshold of the final streets.",
    atmosphere: "City edge noise rising; the Camino’s rural quiet begins to dissolve.",
    history:
      "Near here stood a venta for pilgrims. The cruceiro still marks the psychological doorway into Santiago.",
    practical: "Resist the urge to rush — the last kilometres deserve attention.",
    nuggetIds: ["nugget-meixonfrio"],
  },
  {
    id: "stop-cathedral",
    slug: "catedral-de-santiago",
    name: "Catedral de Santiago",
    kind: "landmark",
    stageId: "stage-6",
    summary: "The end of the Way — towers, plaza, and the long-awaited arrival.",
    atmosphere:
      "Praza do Obradoiro opens like a held breath released. Bags drop. Some cry. Some just sit.",
    history:
      "The cathedral shelters the tradition of St James’s tomb and centuries of European pilgrimage. Arrival here completes the English Way from Ferrol’s docks to Compostela’s heart.",
    practical:
      "Join the pilgrim queue for the Compostela at the Pilgrim Office; then find your own quiet corner of the plaza.",
    nuggetIds: ["nugget-compostela", "nugget-botafumeiro"],
  },
];

export const stops: Stop[] = raw.map((s) => stopSchema.parse(s));

export function getStopBySlug(slug: string) {
  return stops.find((s) => s.slug === slug);
}

export function getStopById(id: string) {
  return stops.find((s) => s.id === id);
}

export function getStopsForStage(stageId: string) {
  return stops.filter((s) => s.stageId === stageId);
}
