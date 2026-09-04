import * as cheerio from "cheerio";

export type ScrapedVenue = {
  name: string;
  matchKey: string;
  street: string | null;
  city: string | null;
};

const VENUES_URL = "https://www.szfb.sk/sk/sport-complex";

/**
 * Kľúč na spárovanie názvu haly zo zápasu s adresárom. Zhadzuje diakritiku,
 * úvodzovky, interpunkciu a príponu 'kategória X' — tá istá hala je v zápasoch
 * napísaná raz ako "ŠH Malina Malacky" a inokedy "ŠH Malina, Malacky".
 */
export function venueMatchKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/["'„“”]/g, "")
    .replace(/kateg[oó]ria\s*\S+/i, "")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** Stiahne adresár hál zo szfb.sk. */
export async function scrapeVenues(): Promise<ScrapedVenue[]> {
  const res = await fetch(VENUES_URL, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SZFBRozhodcoviaBot/1.0)" },
  });

  if (!res.ok) {
    throw new Error(`szfb.sk vrátilo ${res.status} pre zoznam hál.`);
  }

  const $ = cheerio.load(await res.text());
  const venues: ScrapedVenue[] = [];

  $("table tr").each((_, tr) => {
    const cells = $(tr)
      .find("td")
      .map((_, td) => $(td).text().trim().replace(/\s+/g, " "))
      .get();

    if (cells.length < 3 || !cells[0]) return;

    venues.push({
      name: cells[0],
      matchKey: venueMatchKey(cells[0]),
      street: cells[1] || null,
      city: cells[2] || null,
    });
  });

  return venues;
}
