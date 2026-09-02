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
    { code: "JUN-VY", label: "Liga juniorov Východ" },
    { code: "DOR-VY", label: "Liga dorastencov Východ" },
    { code: "SZ-VY", label: "Liga starších žiakov Východ" },
    { code: "MZ-VY", label: "Liga mladších žiakov Východ" },
    { code: "JUNK-VY", label: "Liga junioriek Východ" },
    { code: "SZK-VY", label: "Liga starších žiačok Východ" },
    { code: "MZK-VY", label: "Liga mladších žiačok Východ" },
  ],
  zapad: [
    { code: "M2-ZA", label: "2. liga mužov Západ" },
    { code: "JUN-ZA", label: "Liga juniorov Západ" },
    { code: "DOR-ZA", label: "Liga dorastencov Západ" },
    { code: "SZ-ZA", label: "Liga starších žiakov Západ" },
    { code: "MZ-ZA", label: "Liga mladších žiakov Západ" },
    { code: "JUNK-ZA", label: "Liga junioriek Západ" },
    { code: "DORK-ZA", label: "Liga dorasteniek Západ" },
    { code: "SZK-ZA", label: "Liga starších žiačok Západ" },
    { code: "MZK-ZA", label: "Liga mladších žiačok Západ" },
    { code: "PS-ZA", label: "Liga staršej prípravky Západ" },
    { code: "PM-ZA", label: "Liga mladšej prípravky Západ" },
  ],
  bratislava: [
    { code: "M2-BA", label: "2. liga mužov Bratislava" },
    { code: "JUN-BA", label: "Liga juniorov Bratislava" },
    { code: "DOR-BA", label: "Liga dorastencov Bratislava" },
    { code: "SZ-BA", label: "Liga starších žiakov Bratislava" },
    { code: "MZ-BA", label: "Liga mladších žiakov Bratislava" },
    { code: "JUNK-BA", label: "Liga junioriek Bratislava" },
    { code: "DORK-BA", label: "Liga dorasteniek Bratislava" },
    { code: "SZK-BA", label: "Liga starších žiačok Bratislava" },
    { code: "MZK-BA", label: "Liga mladších žiačok Bratislava" },
    { code: "PS-BA", label: "Liga staršej prípravky Bratislava" },
    { code: "PM-BA", label: "Liga mladšej prípravky Bratislava" },
  ],
  stred: [
    { code: "M2-ST", label: "2. liga mužov Stred" },
    { code: "JUN-ST", label: "Liga juniorov Stred" },
    { code: "DOR-ST", label: "Liga dorastencov Stred" },
    { code: "SZ-ST", label: "Liga starších žiakov Stred" },
    { code: "MZ-ST", label: "Liga mladších žiakov Stred" },
    { code: "PSD-ST", label: "Liga staršej prípravky dievčat Stred" },
  ],
};

export function leaguesForCategory(category: Category): LeagueInfo[] {
  return LEAGUES_BY_CATEGORY[category] ?? [];
}

export function leagueLabel(category: Category, code: string): string {
  return leaguesForCategory(category).find((l) => l.code === code)?.label ?? code;
}
