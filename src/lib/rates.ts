import type { SupabaseClient } from "@supabase/supabase-js";

export type TimeType = "hruby" | "cisty";

export const TIME_TYPE_LABELS: Record<TimeType, string> = {
  hruby: "Hrubý čas",
  cisty: "Čistý čas",
};

export type LeagueRate = {
  league: string;
  /** Ktorý variant je pre túto ligu práve platný. */
  time_type: TimeType;
  /** Celoštátne súťaže: jediná odmena, varianty nemajú. */
  fee: number | null;
  /** Len SZČO: príplatok za cestu mimo mesta bydliska (pri SZČO sídla firmy). */
  travel_supplement: number | null;
  /** Regionálne súťaže: obe varianty, medzi ktorými time_type vyberá. */
  fee_hruby: number | null;
  fee_cisty: number | null;
  meal_hruby: number | null;
  meal_cisty: number | null;
  max_per_day_hruby: number | null;
  max_per_day_cisty: number | null;
};

export type ResolvedRate = {
  /** Odmena za zápas — rovnaká pre dobrovoľníka, SZČO aj rámcovú príkaznú. */
  fee: number | null;
  /** Stravné vo výkaze dobrovoľníckej činnosti. */
  meal: number | null;
  maxPerDay: number | null;
};

/**
 * Sumy platné pre práve nastavený hrací čas. Celoštátne súťaže varianty nemajú,
 * tam platí jediná odmena; pri regionálnych vyberá time_type.
 */
export function resolveRate(rate: LeagueRate): ResolvedRate {
  const hasVariants = rate.fee_hruby != null || rate.fee_cisty != null;

  if (!hasVariants) {
    return { fee: rate.fee, meal: null, maxPerDay: null };
  }

  const cisty = rate.time_type === "cisty";

  return {
    fee: cisty ? rate.fee_cisty : rate.fee_hruby,
    meal: cisty ? rate.meal_cisty : rate.meal_hruby,
    maxPerDay: cisty ? rate.max_per_day_cisty : rate.max_per_day_hruby,
  };
}

export const DEFAULT_MIN_HOURLY_WAGE = 5.259;

export async function getLeagueRates(supabase: SupabaseClient): Promise<LeagueRate[]> {
  const { data } = await supabase.from("league_rates").select("*").order("league");
  return (data ?? []) as LeagueRate[];
}

export async function getMinHourlyWage(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase
    .from("payout_settings")
    .select("value")
    .eq("key", "min_hourly_wage")
    .maybeSingle();

  return data?.value ?? DEFAULT_MIN_HOURLY_WAGE;
}

/**
 * Rozloží dobrovoľnícku odmenu na riadok výkazu: stravné je dané sadzobníkom a
 * zvyšok do cieľovej sumy sa vykáže ako náhrada straty času, čiže sa spätne
 * dopočítajú hodiny. Presne tak sú postavené aj doterajšie výkazy v Exceli
 * (napr. M2 hrubý čas: (25,00 − 3,97) / 5,259 = 4,00 hod).
 */
export function volunteerBreakdown(
  resolved: ResolvedRate,
  minHourlyWage: number,
): { hours: number; timeCompensation: number; meal: number; total: number } | null {
  if (resolved.fee == null) return null;

  const meal = resolved.meal ?? 0;
  const remainder = resolved.fee - meal;

  // Hodiny sa vo výkaze uvádzajú na štvrťhodiny presne, tak ako doteraz.
  const hours = Math.round((remainder / minHourlyWage) * 100) / 100;
  const timeCompensation = Math.round(hours * minHourlyWage * 1000) / 1000;

  return {
    hours,
    timeCompensation,
    meal,
    total: Math.round((timeCompensation + meal) * 100) / 100,
  };
}
