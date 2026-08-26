export const CATEGORIES = [
  "celostatny",
  "vychod",
  "stred",
  "zapad",
  "bratislava",
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Region = Exclude<Category, "celostatny">;

export const REGIONS: Region[] = CATEGORIES.filter(
  (c): c is Region => c !== "celostatny",
);

export function isRegion(value: string): value is Region {
  return (REGIONS as readonly string[]).includes(value);
}

export type RefereeRelation = "domaci" | "celostatny" | "hostujuci";

export const RELATION_LABELS: Record<RefereeRelation, string> = {
  domaci: "Domáci",
  celostatny: "Celoštátny",
  hostujuci: "Hosťujúci",
};

/** Vzťah rozhodcu k práve zobrazenému regiónu — null keď je vybraná kategória "celoštátny". */
export function refereeRelation(
  category: Category,
  homeRegion: Region | null,
  isCelostatnyMember: boolean,
): RefereeRelation | null {
  if (category === "celostatny") return null;
  if (homeRegion === category) return "domaci";
  if (isCelostatnyMember) return "celostatny";
  return "hostujuci";
}

export const CATEGORY_LABELS: Record<Category, string> = {
  celostatny: "Celoštátny",
  vychod: "Východ",
  stred: "Stred",
  zapad: "Západ",
  bratislava: "Bratislava",
};

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}

export function parseCategoryParam(value: string | undefined): Category {
  if (value && isCategory(value)) {
    return value;
  }
  return "celostatny";
}
