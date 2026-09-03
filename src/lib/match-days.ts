import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Category } from "@/lib/categories";

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
  // PostgREST vracia naraz najviac 1000 riadkov a jedna kategória ich za sezónu
  // pokojne prekročí — bez stránkovania by nám dni z konca sezóny ticho vypadli.
  const PAGE_SIZE = 1000;
  const leaguesByDate = new Map<string, Set<string>>();

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data: page, error } = await supabase
      .from("matches")
      .select("match_date, league")
      .eq("category", category)
      .order("match_date")
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    for (const row of page ?? []) {
      const date = row.match_date as string;
      if (!leaguesByDate.has(date)) leaguesByDate.set(date, new Set());
      leaguesByDate.get(date)!.add(row.league as string);
    }

    if ((page?.length ?? 0) < PAGE_SIZE) break;
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
