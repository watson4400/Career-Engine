export function difficultyLabel(
  difficulty: "gentle" | "moderate" | "demanding",
): string {
  switch (difficulty) {
    case "gentle":
      return "Gentle";
    case "moderate":
      return "Moderate";
    case "demanding":
      return "Demanding";
  }
}

export function formatKm(km: number): string {
  return `${km.toFixed(1).replace(/\.0$/, "")} km`;
}

export const tipCategoryLabels: Record<string, string> = {
  footing: "Footing",
  credential: "Credential",
  food: "Food",
  weather: "Weather",
  etiquette: "Etiquette",
  gear: "Gear",
};

export const stopKindLabels: Record<string, string> = {
  port: "Port",
  church: "Church",
  castle: "Castle",
  bridge: "Bridge",
  town: "Town",
  viewpoint: "Viewpoint",
  sanctuary: "Sanctuary",
  landmark: "Landmark",
};

export const eventKindLabels: Record<string, string> = {
  festival: "Festival",
  celebration: "Celebration",
  pilgrimage: "Pilgrimage",
  gastronomy: "Gastronomy",
  cultural: "Cultural",
  patron: "Patron feast",
};
