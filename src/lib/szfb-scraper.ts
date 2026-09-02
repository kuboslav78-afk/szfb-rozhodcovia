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
  { id: "1241", slug: "florbalova-extraliga-muzov", category: "celostatny", league: "MEX" },
  { id: "1242", slug: "hyundai-extraliga-zien", category: "celostatny", league: "ZEX" },
  { id: "1244", slug: "macron-extraliga-juniorov", category: "celostatny", league: "JEX" },
  { id: "1245", slug: "1-liga-muzov", category: "celostatny", league: "M1" },
  { id: "1247", slug: "1-liga-zien", category: "celostatny", league: "Z1" },
  { id: "1248", slug: "1-liga-starsich-ziacok", category: "celostatny", league: "SZY-U15" },
  { id: "1249", slug: "1-liga-dorastencov-divizia-zapad", category: "celostatny", league: "DO-ZA" },
  { id: "1250", slug: "1-liga-dorastencov-divizia-vychod", category: "celostatny", league: "DO-VY" },
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
