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

const EMPTY: Earnings = {
  earnedTotal: 0,
  earnedCount: 0,
  monthTotal: 0,
  monthCount: 0,
  upcomingTotal: 0,
  upcomingCount: 0,
};

type MatchRow = {
  league: string;
  venue: string | null;
  match_date: string;
  referee1_id: string | null;
  referee1_status: string;
  referee2_id: string | null;
  referee2_status: string;
};

async function loadRates(supabase: SupabaseClient) {
  const rates = await fetchAllRows<LeagueRate>((f, t) =>
    supabase.from("league_rates").select("*").order("league").range(f, t),
  );

  return new Map(rates.map((r) => [r.league, r]));
}

async function loadMatches(supabase: SupabaseClient) {
  return fetchAllRows<MatchRow>((f, t) =>
    supabase
      .from("matches")
      .select(
        "league, venue, match_date, referee1_id, referee1_status, referee2_id, referee2_status",
      )
      .order("match_date")
      .order("id")
      .range(f, t),
  );
}

/**
 * Mestá hál — potrebné len na príplatok pri SZČO, ktorý patrí za cestu mimo
 * mesta sídla firmy.
 */
async function loadVenueCities(supabase: SupabaseClient) {
  const venues = await fetchAllRows<{ match_key: string; city: string | null }>((f, t) =>
    supabase.from("venues").select("match_key, city").order("name").range(f, t),
  );

  return new Map(venues.map((v) => [v.match_key, v.city]));
}

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

/** Odmena za jeden zápas vrátane príplatku, ak naň má rozhodca nárok. */
function matchFee(
  match: MatchRow,
  rates: Map<string, LeagueRate>,
  venueCities: Map<string, string | null>,
  contractType: string | null,
  homeCity: string | null,
): number {
  const rate = rates.get(match.league);
  if (!rate) return 0;

  const fee = resolveRate(rate).fee ?? 0;

  // Príplatok patrí len SZČO a len keď sa cestuje mimo mesta sídla firmy.
  if (contractType !== "szco" || rate.travel_supplement == null) return fee;
  if (!match.venue || !homeCity) return fee;

  const venueCity = venueCities.get(venueMatchKey(match.venue));
  if (!venueCity) return fee;

  const sameCity =
    venueCity.localeCompare(homeCity, "sk", { sensitivity: "base" }) === 0;

  return sameCity ? fee : fee + Number(rate.travel_supplement);
}

function accumulate(target: Earnings, fee: number, matchDate: string, today: string) {
  if (matchDate < today) {
    target.earnedTotal += fee;
    target.earnedCount += 1;
    if (matchDate.slice(0, 7) === today.slice(0, 7)) {
      target.monthTotal += fee;
      target.monthCount += 1;
    }
  } else {
    target.upcomingTotal += fee;
    target.upcomingCount += 1;
  }
}

/** Zárobok jedného rozhodcu za aktuálnu sezónu. */
export async function getRefereeEarnings(
  supabase: SupabaseClient,
  refereeId: string,
): Promise<Earnings> {
  const [{ data: referee }, rates, matches, venueCities] = await Promise.all([
    supabase
      .from("referees")
      .select("contract_type, home_city")
      .eq("id", refereeId)
      .maybeSingle(),
    loadRates(supabase),
    loadMatches(supabase),
    loadVenueCities(supabase),
  ]);

  const today = todayDateStr();
  const result = { ...EMPTY };

  for (const match of matches) {
    for (const slot of [1, 2] as const) {
      const id = slot === 1 ? match.referee1_id : match.referee2_id;
      const status = slot === 1 ? match.referee1_status : match.referee2_status;
      if (id !== refereeId || status !== "confirmed") continue;

      const fee = matchFee(
        match,
        rates,
        venueCities,
        referee?.contract_type ?? null,
        referee?.home_city ?? null,
      );
      accumulate(result, fee, match.match_date, today);
    }
  }

  return result;
}

export type OverallEarnings = Earnings & {
  /** Rozpad podľa typu zmluvy — koľko sa už odpískalo za akú zmluvu. */
  byContract: { contractType: string; total: number; referees: number }[];
};

/** Súhrn za všetkých rozhodcov — pre prehľad KRO. */
export async function getOverallEarnings(
  supabase: SupabaseClient,
): Promise<OverallEarnings> {
  const [referees, rates, matches, venueCities] = await Promise.all([
    fetchAllRows<{ id: string; contract_type: string | null; home_city: string | null }>(
      (f, t) =>
        supabase
          .from("referees")
          .select("id, contract_type, home_city")
          .order("id")
          .range(f, t),
    ),
    loadRates(supabase),
    loadMatches(supabase),
    loadVenueCities(supabase),
  ]);

  const byId = new Map(referees.map((r) => [r.id, r]));
  const today = todayDateStr();
  const result: OverallEarnings = { ...EMPTY, byContract: [] };

  const perContract = new Map<string, { total: number; referees: Set<string> }>();

  for (const match of matches) {
    for (const slot of [1, 2] as const) {
      const id = slot === 1 ? match.referee1_id : match.referee2_id;
      const status = slot === 1 ? match.referee1_status : match.referee2_status;
      if (!id || status !== "confirmed") continue;

      const referee = byId.get(id);
      const fee = matchFee(
        match,
        rates,
        venueCities,
        referee?.contract_type ?? null,
        referee?.home_city ?? null,
      );
      accumulate(result, fee, match.match_date, today);

      if (match.match_date < today) {
        const key = referee?.contract_type ?? "neurcena";
        const bucket = perContract.get(key) ?? { total: 0, referees: new Set<string>() };
        bucket.total += fee;
        bucket.referees.add(id);
        perContract.set(key, bucket);
      }
    }
  }

  result.byContract = Array.from(perContract.entries())
    .map(([contractType, v]) => ({
      contractType,
      total: v.total,
      referees: v.referees.size,
    }))
    .sort((a, b) => b.total - a.total);

  return result;
}
