import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "@/lib/categories";
import { fetchAllRows } from "@/lib/paginate";

/**
 * Dopočíta hracie dni kategórie z naimportovaných zápasov: pre každý deň, v ktorý
 * sa v danej kategórii hrá, založí hrací deň a nastaví mu ligy podľa toho, čo sa
 * v ten deň naozaj hrá.
 *
 * Zámerne nič nemaže. Deň zadaný ručne dopredu (rozpis na szfb.sk ešte nie je
 * zverejnený) žiadne zápasy nemá, takže doň táto funkcia vôbec nesiahne a ostane
 * aj s ručne zadanými ligami — odstrániť ho vie admin naďalej v editore.
 */
export async function syncMatchDaysFromMatches(
  supabase: SupabaseClient,
  category: Category,
): Promise<{ created: number; updated: number }> {
  const matchRows = await fetchAllRows<{ match_date: string; league: string }>((from, to) =>
    supabase
      .from("matches")
      .select("match_date, league")
      .eq("category", category)
      .order("match_date")
      .range(from, to),
  );

  const leaguesByDate = new Map<string, Set<string>>();
  for (const row of matchRows) {
    if (!leaguesByDate.has(row.match_date)) leaguesByDate.set(row.match_date, new Set());
    leaguesByDate.get(row.match_date)!.add(row.league);
  }

  if (leaguesByDate.size === 0) return { created: 0, updated: 0 };

  const { data: existingRows } = await supabase
    .from("match_days")
    .select("match_date, leagues")
    .eq("category", category);

  const existing = new Map(
    (existingRows ?? []).map((row) => [
      row.match_date as string,
      ((row.leagues as string[] | null) ?? []).slice().sort(),
    ]),
  );

  const toUpsert: { match_date: string; category: Category; leagues: string[] }[] = [];
  let created = 0;
  let updated = 0;

  for (const [date, leagueSet] of leaguesByDate) {
    const leagues = Array.from(leagueSet).sort();
    const current = existing.get(date);

    if (!current) {
      created++;
    } else if (
      current.length !== leagues.length ||
      current.some((code, i) => code !== leagues[i])
    ) {
      updated++;
    } else {
      continue; // deň aj ligy už sedia
    }

    toUpsert.push({ match_date: date, category, leagues });
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("match_days")
      .upsert(toUpsert, { onConflict: "match_date,category" });

    if (error) throw new Error(error.message);
  }

  return { created, updated };
}
