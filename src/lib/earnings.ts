import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/paginate";
import { resolveRate, type LeagueRate } from "@/lib/rates";
import { todayDateStr } from "@/lib/dates";

export type Earnings = {
  /** Odpískané — potvrdená nominácia na zápas, ktorý sa už odohral. */
  earnedTotal: number;
  earnedCount: number;
  /** Z toho v aktuálnom mesiaci. */
  monthTotal: number;
  monthCount: number;
  /** Potvrdené nominácie na zápasy, ktoré ešte len budú. */
  upcomingTotal: number;
  upcomingCount: number;
};

/** Jeden odpískaný (alebo potvrdený budúci) zápas jedného rozhodcu. */
export type EarningEntry = {
  matchId: string;
  refereeId: string;
  refereeName: string;
  matchDate: string;
  league: string;
  /** Stĺpec "č. k./z." vo výkaze — oficiálne číslo zápasu zo szfb.sk. */
  matchLabel: string;
  teams: string;
  venue: string | null;
  /** Hala aj s adresou, tak ako to chce výkaz činnosti. */
  venueLabel: string;
  /** Odmena za zápas podľa sadzobníka, bez príplatku. */
  fee: number;
  /** Príplatok SZČO — najviac jeden na hrací deň, viď resolveSupplements. */
  supplement: number;
  /** Odmena + príplatok. */
  total: number;
  played: boolean;
};

type MatchRow = {
  id: string;
  league: string;
  match_number: number | null;
  round: string | null;
  venue: string | null;
  match_date: string;
  team_home: string;
  team_away: string;
  referee1_id: string | null;
  referee1_status: string;
  referee2_id: string | null;
  referee2_status: string;
};

type RefereeRow = {
  id: string;
  full_name: string;
  contract_type: string | null;
  home_city: string | null;
};

function venueMatchKey(name: string): string {
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

/** Názov haly aj s adresou; keď halu v adresári nemáme, aspoň názov zo zápasu. */
function venueLabelFor(
  venue: string | null,
  venues: Map<string, { name: string; full_address: string | null }>,
): string {
  if (!venue) return "";

  const directory = venues.get(venueMatchKey(venue));
  if (!directory?.full_address) return venue;

  const name = directory.name.replace(/\s*"kateg[oó]ria[^"]*"\s*$/i, "").trim();
  return `${name}, ${directory.full_address}`;
}

/**
 * Príplatok, na ktorý by zápas sám o sebe zakladal nárok. Či ho rozhodca naozaj
 * dostane, rozhodne až resolveSupplements — na jeden hrací deň patrí len jeden.
 */
function candidateSupplement(
  match: MatchRow,
  rate: LeagueRate | undefined,
  referee: RefereeRow | undefined,
  venueCities: Map<string, string | null>,
): number {
  if (!rate || rate.travel_supplement == null) return 0;
  if (referee?.contract_type !== "szco") return 0;
  if (!match.venue || !referee.home_city) return 0;

  const venueCity = venueCities.get(venueMatchKey(match.venue));
  if (!venueCity) return 0;

  const sameCity =
    venueCity.localeCompare(referee.home_city, "sk", { sensitivity: "base" }) === 0;

  return sameCity ? 0 : Number(rate.travel_supplement);
}

/**
 * Rozhodca SZČO má nárok najviac na jeden príplatok za hrací deň, a to na ten
 * najvyšší možný. Keď teda v jeden deň píska extraligu aj prvú ligu, dostane
 * príplatok len raz, vo výške toho vyššieho.
 */
function resolveSupplements(
  entries: (EarningEntry & { candidate: number })[],
): EarningEntry[] {
  const byRefereeDay = new Map<string, (EarningEntry & { candidate: number })[]>();

  for (const entry of entries) {
    const key = `${entry.refereeId}|${entry.matchDate}`;
    if (!byRefereeDay.has(key)) byRefereeDay.set(key, []);
    byRefereeDay.get(key)!.push(entry);
  }

  for (const sameDay of byRefereeDay.values()) {
    let best: (EarningEntry & { candidate: number }) | null = null;
    for (const entry of sameDay) {
      if (entry.candidate > (best?.candidate ?? 0)) best = entry;
    }
    if (best) best.supplement = best.candidate;
  }

  return entries.map((entry) => ({
    matchId: entry.matchId,
    refereeId: entry.refereeId,
    refereeName: entry.refereeName,
    matchDate: entry.matchDate,
    league: entry.league,
    matchLabel: entry.matchLabel,
    teams: entry.teams,
    venue: entry.venue,
    venueLabel: entry.venueLabel,
    fee: entry.fee,
    supplement: entry.supplement,
    total: entry.fee + entry.supplement,
    played: entry.played,
  }));
}

/**
 * Všetky potvrdené nominácie s vypočítanou odmenou. Z toho sa skladá karta na
 * dashboarde, mesačný rozpis na stránke Odmeny aj podklady pre výplaty.
 */
export async function getEarningEntries(
  supabase: SupabaseClient,
  refereeId?: string,
): Promise<EarningEntry[]> {
  const [referees, rateRows, matches, venueRows] = await Promise.all([
    fetchAllRows<RefereeRow>((f, t) =>
      supabase
        .from("referees")
        .select("id, full_name, contract_type, home_city")
        .order("id")
        .range(f, t),
    ),
    fetchAllRows<LeagueRate>((f, t) =>
      supabase.from("league_rates").select("*").order("league").range(f, t),
    ),
    fetchAllRows<MatchRow>((f, t) =>
      supabase
        .from("matches")
        .select(
          "id, league, match_number, round, venue, match_date, team_home, team_away, referee1_id, referee1_status, referee2_id, referee2_status",
        )
        .order("match_date")
        .order("id")
        .range(f, t),
    ),
    fetchAllRows<{
      name: string;
      match_key: string;
      city: string | null;
      full_address: string | null;
    }>((f, t) =>
      supabase
        .from("venues")
        .select("name, match_key, city, full_address")
        .order("name")
        .range(f, t),
    ),
  ]);

  const refereeById = new Map(referees.map((r) => [r.id, r]));
  const rateByLeague = new Map(rateRows.map((r) => [r.league, r]));
  const venueCities = new Map(venueRows.map((v) => [v.match_key, v.city]));
  const venueByKey = new Map(venueRows.map((v) => [v.match_key, v]));
  const today = todayDateStr();

  const draft: (EarningEntry & { candidate: number })[] = [];

  for (const match of matches) {
    for (const slot of [1, 2] as const) {
      const id = slot === 1 ? match.referee1_id : match.referee2_id;
      const status = slot === 1 ? match.referee1_status : match.referee2_status;
      if (!id || status !== "confirmed") continue;
      if (refereeId && id !== refereeId) continue;

      const referee = refereeById.get(id);
      const rate = rateByLeague.get(match.league);

      draft.push({
        matchId: match.id,
        refereeId: id,
        refereeName: referee?.full_name ?? "?",
        matchDate: match.match_date,
        league: match.league,
        matchLabel:
          match.match_number != null ? String(match.match_number) : (match.round ?? ""),
        teams: `${match.team_home} – ${match.team_away}`,
        venue: match.venue,
        venueLabel: venueLabelFor(match.venue, venueByKey),
        fee: rate ? (resolveRate(rate).fee ?? 0) : 0,
        supplement: 0,
        total: 0,
        played: match.match_date < today,
        candidate: candidateSupplement(match, rate, referee, venueCities),
      });
    }
  }

  return resolveSupplements(draft).sort((a, b) =>
    b.matchDate.localeCompare(a.matchDate),
  );
}

function summarise(entries: EarningEntry[], today: string): Earnings {
  const result: Earnings = {
    earnedTotal: 0,
    earnedCount: 0,
    monthTotal: 0,
    monthCount: 0,
    upcomingTotal: 0,
    upcomingCount: 0,
  };

  for (const entry of entries) {
    if (entry.played) {
      result.earnedTotal += entry.total;
      result.earnedCount += 1;
      if (entry.matchDate.slice(0, 7) === today.slice(0, 7)) {
        result.monthTotal += entry.total;
        result.monthCount += 1;
      }
    } else {
      result.upcomingTotal += entry.total;
      result.upcomingCount += 1;
    }
  }

  return result;
}

/** Zárobok jedného rozhodcu za aktuálnu sezónu. */
export async function getRefereeEarnings(
  supabase: SupabaseClient,
  refereeId: string,
): Promise<Earnings> {
  const entries = await getEarningEntries(supabase, refereeId);
  return summarise(entries, todayDateStr());
}

export type OverallEarnings = Earnings & {
  /** Rozpad podľa typu zmluvy — koľko sa už odpískalo za akú zmluvu. */
  byContract: { contractType: string; total: number; referees: number }[];
};

/** Súhrn za všetkých rozhodcov — pre prehľad KRO. */
export async function getOverallEarnings(
  supabase: SupabaseClient,
): Promise<OverallEarnings> {
  const [entries, referees] = await Promise.all([
    getEarningEntries(supabase),
    fetchAllRows<{ id: string; contract_type: string | null }>((f, t) =>
      supabase.from("referees").select("id, contract_type").order("id").range(f, t),
    ),
  ]);

  const contractById = new Map(referees.map((r) => [r.id, r.contract_type]));
  const perContract = new Map<string, { total: number; referees: Set<string> }>();

  for (const entry of entries) {
    if (!entry.played) continue;
    const key = contractById.get(entry.refereeId) ?? "neurcena";
    const bucket = perContract.get(key) ?? { total: 0, referees: new Set<string>() };
    bucket.total += entry.total;
    bucket.referees.add(entry.refereeId);
    perContract.set(key, bucket);
  }

  return {
    ...summarise(entries, todayDateStr()),
    byContract: Array.from(perContract.entries())
      .map(([contractType, v]) => ({
        contractType,
        total: v.total,
        referees: v.referees.size,
      }))
      .sort((a, b) => b.total - a.total),
  };
}
