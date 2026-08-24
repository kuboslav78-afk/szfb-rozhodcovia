export const CATEGORIES = [
  "celostatny",
  "vychod",
  "stred",
  "zapad",
  "bratislava",
] as const;

export type Category = (typeof CATEGORIES)[number];

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
