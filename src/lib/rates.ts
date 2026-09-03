import type { SupabaseClient } from "@supabase/supabase-js";

export type TimeType = "hruby" | "cisty";

export const TIME_TYPE_LABELS: Record<TimeType, string> = {
  hruby: "Hrubý čas",
  cisty: "Čistý čas",
};

export type LeagueRate = {
  league: string;
  time_type: TimeType;
  /** Odmena za zápas pre SZČO aj rámcovú príkaznú zmluvu. */
  fee: number | null;
  /** Len SZČO: príplatok za cestu mimo mesta bydliska (pri SZČO sídla firmy). */
  travel_supplement: number | null;
  /** Cieľová suma vo výkaze dobrovoľníckej činnosti. */
  volunteer_fee: number | null;
  volunteer_meal: number | null;
  volunteer_max_per_day: number | null;
};

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
  rate: Pick<LeagueRate, "volunteer_fee" | "volunteer_meal">,
  minHourlyWage: number,
): { hours: number; timeCompensation: number; meal: number; total: number } | null {
  if (rate.volunteer_fee == null) return null;

  const meal = rate.volunteer_meal ?? 0;
  const remainder = rate.volunteer_fee - meal;

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
