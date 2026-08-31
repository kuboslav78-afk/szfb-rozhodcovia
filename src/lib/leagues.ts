import type { Category } from "@/lib/categories";

export type LeagueInfo = { code: string; label: string };

/**
 * Zoznam líg, ktoré sa dajú priradiť k hraciemu dňu, podľa kategórie. Ide o pevný
 * zoznam (nie admin-editovateľná tabuľka) — mení sa len raz za sezónu, keď SZFB
 * vyhlási nové súťaže.
 */
export const LEAGUES_BY_CATEGORY: Partial<Record<Category, LeagueInfo[]>> = {
  celostatny: [
    { code: "MEX", label: "Mužská extraliga" },
    { code: "ZEX", label: "Ženská extraliga" },
    { code: "JEX", label: "Juniorská extraliga" },
    { code: "M1", label: "1. liga mužov" },
    { code: "Z1", label: "1. liga žien" },
    { code: "SZY-U15", label: "Staršie žiačky U15 celoštátna liga" },
    { code: "DO-VY", label: "Dorastenecká nadstavbová divízia (Východ)" },
    { code: "DO-ZA", label: "Dorastenecká nadstavbová divízia (Západ)" },
  ],
  vychod: [
    { code: "M2-VY", label: "2. liga mužov Východ" },
    { code: "SZ-VY", label: "Liga starších žiakov Východ" },
    { code: "DOR-VY", label: "Liga dorastencov Východ" },
    { code: "JUN-VY", label: "Liga juniorov Východ" },
    { code: "MZ-VY", label: "Liga mladších žiakov Východ" },
  ],
  stred: [{ code: "M2-ST", label: "2. liga mužov Stred" }],
  zapad: [
    { code: "M2-ZA", label: "2. liga mužov Západ" },
    { code: "SZ-ZA", label: "Liga starších žiakov Západ" },
    { code: "DOR-ZA", label: "Liga dorastencov Západ" },
    { code: "MZ-ZA", label: "Liga mladších žiakov Západ" },
  ],
  bratislava: [
    { code: "M2-BA", label: "2. liga mužov Bratislava" },
    { code: "SZ-BA", label: "Liga starších žiakov Bratislava" },
    { code: "DOR-BA", label: "Liga dorastencov Bratislava" },
    { code: "JUN-BA", label: "Liga juniorov Bratislava" },
    { code: "MZ-BA", label: "Liga mladších žiakov Bratislava" },
  ],
};

export function leaguesForCategory(category: Category): LeagueInfo[] {
  return LEAGUES_BY_CATEGORY[category] ?? [];
}

export function leagueLabel(category: Category, code: string): string {
  return leaguesForCategory(category).find((l) => l.code === code)?.label ?? code;
}
