import { z } from "zod";

export const tipCategorySchema = z.enum([
  "footing",
  "credential",
  "food",
  "weather",
  "etiquette",
  "gear",
]);

export const tipSchema = z.object({
  id: z.string(),
  category: tipCategorySchema,
  title: z.string(),
  body: z.string(),
  stageIds: z.array(z.string()).optional(),
});

export const nuggetSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  era: z.string().optional(),
  stageIds: z.array(z.string()).optional(),
  stopIds: z.array(z.string()).optional(),
});

export const stopSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  kind: z.enum([
    "port",
    "church",
    "castle",
    "bridge",
    "town",
    "viewpoint",
    "sanctuary",
    "landmark",
  ]),
  stageId: z.string(),
  summary: z.string(),
  atmosphere: z.string(),
  history: z.string(),
  practical: z.string().optional(),
  nuggetIds: z.array(z.string()).default([]),
});

export const townEventKindSchema = z.enum([
  "festival",
  "celebration",
  "pilgrimage",
  "gastronomy",
  "cultural",
  "patron",
]);

export const townEventSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  kind: townEventKindSchema,
  /** Primary town/stop this event belongs to on the Camino Inglés. */
  stopIds: z.array(z.string()).min(1),
  stageIds: z.array(z.string()).default([]),
  /** Inclusive ISO dates (YYYY-MM-DD) for the current season when known. */
  startDate: z.string(),
  endDate: z.string(),
  whenLabel: z.string(),
  townLabel: z.string(),
  summary: z.string(),
  body: z.string(),
  practical: z.string().optional(),
  /** True for traditional annual dates that recur every year. */
  recurring: z.boolean().default(true),
  /** Year confirmed for dated programmes (e.g. 2026 press dates). */
  confirmedYear: z.number().int().optional(),
});

export const stageSchema = z.object({
  id: z.string(),
  slug: z.string(),
  number: z.number().int().positive(),
  from: z.string(),
  to: z.string(),
  distanceKm: z.number().positive(),
  difficulty: z.enum(["gentle", "moderate", "demanding"]),
  elevationFeel: z.string(),
  narrative: z.string(),
  highlight: z.string(),
  stopIds: z.array(z.string()),
  tipIds: z.array(z.string()),
  nuggetIds: z.array(z.string()),
});

export type TipCategory = z.infer<typeof tipCategorySchema>;
export type Tip = z.infer<typeof tipSchema>;
export type Nugget = z.infer<typeof nuggetSchema>;
export type Stop = z.infer<typeof stopSchema>;
export type TownEventKind = z.infer<typeof townEventKindSchema>;
export type TownEvent = z.infer<typeof townEventSchema>;
export type Stage = z.infer<typeof stageSchema>;
