import * as cheerio from "cheerio";
import type { Category } from "@/lib/categories";

export type CompetitionConfig = {
  id: string;
  slug: string;
  category: Category;
  league: string;
};

/** Súťaže naimportovateľné zo szfb.sk — pridávaj sem nové podľa potreby. */
export const COMPETITIONS: CompetitionConfig[] = [
  // Celoštátny
  { id: "1241", slug: "florbalova-extraliga-muzov", category: "celostatny", league: "MEX" },
  { id: "1242", slug: "hyundai-extraliga-zien", category: "celostatny", league: "ZEX" },
  { id: "1244", slug: "macron-extraliga-juniorov", category: "celostatny", league: "JEX" },
  { id: "1245", slug: "1-liga-muzov", category: "celostatny", league: "M1" },
  { id: "1247", slug: "1-liga-zien", category: "celostatny", league: "Z1" },
  { id: "1248", slug: "1-liga-starsich-ziacok", category: "celostatny", league: "SZY-U15" },
  { id: "1249", slug: "1-liga-dorastencov-divizia-zapad", category: "celostatny", league: "DO-ZA" },
  { id: "1250", slug: "1-liga-dorastencov-divizia-vychod", category: "celostatny", league: "DO-VY" },

  // Východ
  { id: "1243", slug: "2-liga-muzov-vychod", category: "vychod", league: "M2-VY" },
  { id: "1246", slug: "liga-juniorov-vychod", category: "vychod", league: "JUN-VY" },
  { id: "1256", slug: "liga-dorastencov-vychod", category: "vychod", league: "DOR-VY" },
  { id: "1257", slug: "liga-starsich-ziakov-vychod", category: "vychod", league: "SZ-VY" },
  { id: "1258", slug: "liga-mladsich-ziakov-vychod", category: "vychod", league: "MZ-VY" },
  { id: "1294", slug: "liga-junioriek-vychod", category: "vychod", league: "JUNK-VY" },
  { id: "1296", slug: "liga-starsich-ziacok-vychod", category: "vychod", league: "SZK-VY" },
  { id: "1297", slug: "liga-mladsich-ziacok-vychod", category: "vychod", league: "MZK-VY" },

  // Západ
  { id: "1262", slug: "2-liga-muzov-zapad", category: "zapad", league: "M2-ZA" },
  { id: "1264", slug: "liga-juniorov-zapad", category: "zapad", league: "JUN-ZA" },
  { id: "1267", slug: "liga-dorastencov-zapad", category: "zapad", league: "DOR-ZA" },
  { id: "1278", slug: "liga-starsich-ziakov-zapad", category: "zapad", league: "SZ-ZA" },
  { id: "1281", slug: "liga-mladsich-ziakov-zapad", category: "zapad", league: "MZ-ZA" },
  { id: "1282", slug: "liga-junioriek-zapad", category: "zapad", league: "JUNK-ZA" },
  { id: "1283", slug: "liga-dorasteniek-zapad", category: "zapad", league: "DORK-ZA" },
  { id: "1284", slug: "liga-starsich-ziacok-zapad", category: "zapad", league: "SZK-ZA" },
  { id: "1285", slug: "liga-mladsich-ziacok-zapad", category: "zapad", league: "MZK-ZA" },
  { id: "1286", slug: "liga-starsej-pripravky-zapad", category: "zapad", league: "PS-ZA" },
  { id: "1287", slug: "liga-mladsej-pripravky-zapad", category: "zapad", league: "PM-ZA" },

  // Bratislava
  { id: "1261", slug: "2-liga-muzov-bratislava", category: "bratislava", league: "M2-BA" },
  { id: "1263", slug: "liga-juniorov-bratislava", category: "bratislava", league: "JUN-BA" },
  { id: "1266", slug: "liga-dorastencov-bratislava", category: "bratislava", league: "DOR-BA" },
  { id: "1280", slug: "liga-starsich-ziakov-bratislava", category: "bratislava", league: "SZ-BA" },
  { id: "1279", slug: "liga-mladsich-ziakov-bratislava", category: "bratislava", league: "MZ-BA" },
  { id: "1293", slug: "liga-junioriek-bratislava", category: "bratislava", league: "JUNK-BA" },
  { id: "1292", slug: "liga-dorasteniek-bratislava", category: "bratislava", league: "DORK-BA" },
  { id: "1291", slug: "liga-starsich-ziacok-bratislava", category: "bratislava", league: "SZK-BA" },
  { id: "1290", slug: "liga-mladsich-ziacok-bratislava", category: "bratislava", league: "MZK-BA" },
  { id: "1289", slug: "liga-starsej-pripravky-bratislava", category: "bratislava", league: "PS-BA" },
  { id: "1288", slug: "liga-mladsej-pripravky-bratislava", category: "bratislava", league: "PM-BA" },

  // Stred
  { id: "1265", slug: "2-liga-muzov-stred", category: "stred", league: "M2-ST" },
  { id: "1268", slug: "liga-juniorov-stred", category: "stred", league: "JUN-ST" },
  { id: "1269", slug: "liga-dorastencov-stred", category: "stred", league: "DOR-ST" },
  { id: "1270", slug: "liga-starsich-ziakov-stred", category: "stred", league: "SZ-ST" },
  { id: "1271", slug: "liga-mladsich-ziakov-stred", category: "stred", league: "MZ-ST" },
  { id: "1301", slug: "liga-starsej-pripravky-dievcat-stred", category: "stred", league: "PSD-ST" },
];

export type ScrapedMatch = {
  externalMatchId: string;
  matchNumber: number | null; // oficiálne "Č.z." zo szfb.sk, súvislé naprieč sezónou
  round: string | null;
  teamHome: string;
  teamAway: string;
  matchDate: string; // YYYY-MM-DD
  matchTime: string | null; // HH:MM
  venue: string | null;
};

function parseSkDate(dateStr: string): string | null {
  // formát "12.09.2026"
  const m = dateStr.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!m) return null;
  const [, day, month, year] = m;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

export async function scrapeCompetition(
  competition: CompetitionConfig,
): Promise<ScrapedMatch[]> {
  const url = `https://www.szfb.sk/sk/stats/results/${competition.id}/${competition.slug}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; SZFBRozhodcoviaBot/1.0)" },
  });

  if (!res.ok) {
    throw new Error(`szfb.sk vrátilo ${res.status} pre ${url}`);
  }

  const html = await res.text();
  const $ = cheerio.load(html);

  const matches: ScrapedMatch[] = [];
  let currentRound: string | null = null;

  $(".headline-bg h4, tr.fn-tap-row").each((_, el) => {
    const $el = $(el);

    if ($el.is("h4")) {
      currentRound = $el.text().trim();
      return;
    }

    const teamHome = $el
      .find("td.td-mobile-w-team")
      .first()
      .find("span.hidden-xs")
      .text()
      .trim();
    const teamAway = $el
      .find("td.td-mobile-w-team.team-away")
      .find("span.hidden-xs")
      .text()
      .trim();

    if (!teamHome || !teamAway) return;

    const matchNumberText = $el.find("td.hidden-xs").first().text().trim();
    const matchNumber = /^\d+$/.test(matchNumberText) ? Number(matchNumberText) : null;

    const dateText = $el
      .find(".hidden-xs.hidden-lg.hover-hide-sm-down")
      .first()
      .text()
      .trim();
    const matchDate = parseSkDate(dateText);
    if (!matchDate) return;

    const timeText = $el.find("div.hidden-xs.hover-hide").first().text().trim();
    const matchTime =
      /^\d{1,2}:\d{2}$/.test(timeText) && timeText !== "0:00"
        ? timeText.padStart(5, "0")
        : null;

    const venueTextRaw = $el
      .find(".td-box.hidden-xs.hidden-sm.hover-hide")
      .first()
      .text()
      .trim()
      .replace(/\s+/g, " ");
    const venueText = venueTextRaw && venueTextRaw !== "t.b.a." ? venueTextRaw : "";

    const previewHref = $el.find('a[href*="/preview"]').attr("href") ?? "";
    const matchIdMatch = previewHref.match(/\/match\/(\d+)\/preview/);
    const externalMatchId = matchIdMatch ? matchIdMatch[1] : `${matchDate}-${teamHome}-${teamAway}`;

    matches.push({
      externalMatchId,
      matchNumber,
      round: currentRound,
      teamHome,
      teamAway,
      matchDate,
      matchTime,
      venue: venueText || null,
    });
  });

  return matches;
}
