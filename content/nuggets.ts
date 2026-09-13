import { nuggetSchema, type Nugget } from "./schema";

const raw: Nugget[] = [
  {
    id: "nugget-english-way",
    title: "Why “Inglés”?",
    body: "Medieval pilgrims from England, Ireland, and northern Europe often sailed to Galician ports — Ferrol and A Coruña — then walked inland to Compostela. The route kept the name long after Henry VIII’s break with Rome quieted English pilgrimage for centuries.",
    era: "Medieval–Tudor",
    stageIds: ["stage-1"],
  },
  {
    id: "nugget-ferrol-arsenal",
    title: "Europe’s great northern arsenal",
    body: "In the mid-18th century Ferrol became home to the Gran Arsenal del Norte. The neoclassical grid of A Madalena housed the navy’s workforce — turning a medieval port into one of Enlightenment Spain’s most planned cities.",
    era: "18th century",
    stageIds: ["stage-1"],
    stopIds: ["stop-curuxeiras", "stop-madalena"],
  },
  {
    id: "nugget-curuxeiras",
    title: "Docks older than the arsenal",
    body: "The Curuxeiras quays mark where medieval Ferrol met the sea. Starting here is the historical handshake between ship and shoe that defined the English Way.",
    era: "11th century onward",
    stageIds: ["stage-1"],
    stopIds: ["stop-curuxeiras"],
  },
  {
    id: "nugget-andrade",
    title: "The Andrade lords",
    body: "Pontedeume grew under the powerful Andrade family, whose castle and tower still punctuate the skyline. Their patronage shaped churches, bridges, and the map pilgrims still walk.",
    era: "Late medieval",
    stageIds: ["stage-2"],
    stopIds: ["stop-pontedeume", "stop-castelo-andrade"],
  },
  {
    id: "nugget-ponte-deume",
    title: "Bridge of the Eume",
    body: "The town’s name says it plainly: the bridge over the river Eume. For centuries this crossing funnelled trade and pilgrims between coast and inland Galicia.",
    era: "Medieval",
    stageIds: ["stage-2"],
    stopIds: ["stop-pontedeume"],
  },
  {
    id: "nugget-betanzos-knights",
    title: "City of Knights",
    body: "Betanzos — Cidade dos Cabaleiros — was one of Galicia’s historic capitals. Gothic churches crowd the old town; noble coats of arms still watch the plazas.",
    era: "Gothic era",
    stageIds: ["stage-3"],
    stopIds: ["stop-betanzos"],
  },
  {
    id: "nugget-betanzos-tortilla",
    title: "A tortilla with a reputation",
    body: "Betanzos is famous for a nearly liquid tortilla española. Pilgrims debate which bar does it best; the dish itself is a living local legend.",
    era: "Culinary tradition",
    stageIds: ["stage-3"],
    stopIds: ["stop-betanzos"],
  },
  {
    id: "nugget-bruma-meeting",
    title: "Where two Caminos become one",
    body: "At Bruma, the Ferrol route meets pilgrims who started in A Coruña. From here the last stretch to Santiago is shared — a reunion written into the geography.",
    era: "Route lore",
    stageIds: ["stage-4", "stage-5"],
    stopIds: ["stop-bruma"],
  },
  {
    id: "nugget-presedo",
    title: "Sanctuary in the hills",
    body: "Nosa Señora da Saleta at Presedo offers a quiet pause on the demanding Betanzos–Bruma stage. The municipal albergue sits beside it — pilgrimage and pastoral care on one hillside.",
    era: "Modern devotion",
    stageIds: ["stage-4"],
    stopIds: ["stop-presedo"],
  },
  {
    id: "nugget-tambre",
    title: "Crossing the Tambre",
    body: "The bridge at Sigüeiro spans the Tambre, an ancient river boundary. Crossing it, you enter the municipality of Santiago — Compostela’s gravity begins to pull.",
    era: "Ancient–medieval",
    stageIds: ["stage-5", "stage-6"],
    stopIds: ["stop-sigueiro"],
  },
  {
    id: "nugget-meixonfrio",
    title: "An inn at Meixonfrío",
    body: "Near the Cruceiro da Coruña once stood a venta where pilgrims refreshed before the final streets. The stone cross still marks the threshold between approach and arrival.",
    era: "Pilgrim lore",
    stageIds: ["stage-6"],
    stopIds: ["stop-cruceiro-coruna"],
  },
  {
    id: "nugget-compostela",
    title: "The tomb and the star",
    body: "Compostela is often linked to campus stellae — field of the star — recalling the legend of St James’s tomb revealed by lights in the sky. Whether etymology or poetry, the cathedral remains the magnetic end of every Camino.",
    era: "Early medieval legend",
    stageIds: ["stage-6"],
    stopIds: ["stop-cathedral"],
  },
  {
    id: "nugget-botafumeiro",
    title: "The swinging censer",
    body: "The Botafumeiro — the cathedral’s giant incense burner — once perfumed crowded medieval naves. Catching it in flight is luck and timing; the building itself is the constant.",
    era: "Cathedral tradition",
    stageIds: ["stage-6"],
    stopIds: ["stop-cathedral"],
  },
  {
    id: "nugget-scallop",
    title: "The scallop as compass",
    body: "The vieira became the pilgrim’s badge. Its grooves were said to gather at a single point — like routes converging on Santiago — and shells were collected on Galician shores as proof of completion.",
    era: "Medieval symbol",
  },
  {
    id: "nugget-henry-viii",
    title: "A royal divorce, a quieted path",
    body: "When Henry VIII broke with Rome, English pilgrimage withered. The Camino Inglés faded until modern walkers revived the coastal approach — proof that paths can sleep and wake again.",
    era: "16th century",
    stageIds: ["stage-1"],
  },
];

export const nuggets: Nugget[] = raw.map((n) => nuggetSchema.parse(n));

export function getNuggetById(id: string) {
  return nuggets.find((n) => n.id === id);
}

export function getNuggetsForStage(stageId: string) {
  return nuggets.filter((n) => !n.stageIds?.length || n.stageIds.includes(stageId));
}

export function getNuggetsForStop(stopId: string) {
  return nuggets.filter((n) => n.stopIds?.includes(stopId));
}
