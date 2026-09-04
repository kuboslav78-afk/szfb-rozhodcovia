import * as cheerio from "cheerio";

export type ScrapedVenue = {
  name: string;
  matchKey: string;
  street: string | null;
  city: string | null;
  detailUrl: string | null;
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

    const href = $(tr).find("a").first().attr("href");

    venues.push({
      name: cells[0],
      matchKey: venueMatchKey(cells[0]),
      street: cells[1] || null,
      city: cells[2] || null,
      detailUrl: href ? new URL(href, VENUES_URL).toString() : null,
    });
  });

  return venues;
}

/**
 * Plná adresa haly z jej detailu. Stránka ju nikde nezobrazuje ako text — je len
 * v og:description v tvare "Tajovského 2, 976 32 Badín, Slovensko". Koncové
 * ", Slovensko" zahadzujeme, vo výkaze sa neuvádza.
 */
export async function scrapeVenueAddress(detailUrl: string): Promise<string | null> {
  const res = await fetch(detailUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SZFBRozhodcoviaBot/1.0)" },
  });

  if (!res.ok) return null;

  const $ = cheerio.load(await res.text());
  const raw = $('meta[property="og:description"]').attr("content")?.trim();
  if (!raw) return null;

  return raw.replace(/,\s*Slovensko\s*$/i, "").trim() || null;
}
