"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMPETITIONS, scrapeCompetition } from "@/lib/szfb-scraper";

async function requireSuperAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Pre túto akciu sa musíš prihlásiť.");
  }

  const { data: referee } = await supabase
    .from("referees")
    .select("role")
    .eq("id", user.id)
    .single();

  if (referee?.role !== "admin") {
    throw new Error("Túto akciu môže vykonať len administrátor.");
  }
}

/** Naimportuje/aktualizuje zápasy jednej súťaže zo szfb.sk. */
export async function importCompetition(competitionId: string) {
  await requireSuperAdmin();

  const competition = COMPETITIONS.find((c) => c.id === competitionId);
  if (!competition) throw new Error("Neznáma súťaž.");

  const scraped = await scrapeCompetition(competition);

  const supabase = await createClient();

  let created = 0;
  let updated = 0;

  for (const match of scraped) {
    const { data: existing } = await supabase
      .from("matches")
      .select("id, match_time, referee1_id, referee1_status, referee2_id, referee2_status")
      .eq("external_competition_id", competition.id)
      .eq("external_match_id", match.externalMatchId)
      .maybeSingle();

    const row: Record<string, unknown> = {
      category: competition.category,
      league: competition.league,
      external_competition_id: competition.id,
      external_match_id: match.externalMatchId,
      match_number: match.matchNumber,
      round: match.round,
      team_home: match.teamHome,
      team_away: match.teamAway,
      match_date: match.matchDate,
      match_time: match.matchTime,
      venue: match.venue,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Ak sa oproti predošlému importu zmenil čas, označíme to na
      // zvýraznenie v appke — kým to admin nepotvrdí (acknowledgeTimeChange).
      // Rozhodcovia, ktorí už mali nomináciu potvrdenú na starý čas, ju musia
      // znova schváliť — vrátime im stav na "sent" (odoslaná, čaká na potvrdenie).
      // Postgres "time" stĺpec sa vracia ako "HH:MM:SS", scraper dáva "HH:MM" —
      // porovnávame len prvých 5 znakov, aby sa rovnaký čas nepovažoval za zmenu.
      const existingTime = existing.match_time?.slice(0, 5) ?? null;
      if (existingTime !== null && existingTime !== match.matchTime) {
        row.previous_match_time = existing.match_time;
        row.time_changed_at = new Date().toISOString();

        if (existing.referee1_id && existing.referee1_status === "confirmed") {
          row.referee1_status = "sent";
        }
        if (existing.referee2_id && existing.referee2_status === "confirmed") {
          row.referee2_status = "sent";
        }
      }

      const { error } = await supabase.from("matches").update(row).eq("id", existing.id);
      if (error) throw new Error(error.message);
      updated++;
    } else {
      const { error } = await supabase.from("matches").insert(row);
      if (error) throw new Error(error.message);
      created++;
    }
  }

  revalidatePath("/nominations");

  return { created, updated, total: scraped.length };
}

export type FoundMatch = {
  id: string;
  match_number: number | null;
  league: string;
  category: string;
  team_home: string;
  team_away: string;
  match_date: string;
  match_time: string | null;
  venue: string | null;
};

/** Nájde zápasy podľa čísla zápasu (Č.z.) — ručný vstup pre žiadosti z interného ISF, kým sa nedostanú na verejný web. */
export async function findMatchesByNumber(matchNumber: number): Promise<FoundMatch[]> {
  await requireSuperAdmin();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select("id, match_number, league, category, team_home, team_away, match_date, match_time, venue")
    .eq("match_number", matchNumber);

  if (error) throw new Error(error.message);

  return data ?? [];
}

export type ManualMatchUpdateInput = {
  matchDate: string;
  matchTime: string | null;
  venue: string | null;
};

/** Ručná úprava termínu/haly zápasu (napr. podľa žiadosti z ISF, ešte pred jej prejavením na verejnom webe). */
export async function manualUpdateMatch(matchId: string, input: ManualMatchUpdateInput) {
  await requireSuperAdmin();

  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from("matches")
    .select("match_time, referee1_id, referee1_status, referee2_id, referee2_status")
    .eq("id", matchId)
    .single();

  if (fetchError || !existing) throw new Error("Zápas sa nenašiel.");

  const row: Record<string, unknown> = {
    match_date: input.matchDate,
    match_time: input.matchTime,
    venue: input.venue,
    updated_at: new Date().toISOString(),
  };

  if (existing.match_time !== null && existing.match_time !== input.matchTime) {
    row.previous_match_time = existing.match_time;
    row.time_changed_at = new Date().toISOString();

    if (existing.referee1_id && existing.referee1_status === "confirmed") {
      row.referee1_status = "sent";
    }
    if (existing.referee2_id && existing.referee2_status === "confirmed") {
      row.referee2_status = "sent";
    }
  }

  const { error } = await supabase.from("matches").update(row).eq("id", matchId);
  if (error) throw new Error(error.message);

  revalidatePath("/nominations");
}

/** Admin potvrdí, že si všimol zmenu času — zruší zvýraznenie. */
export async function acknowledgeTimeChange(matchId: string) {
  await requireSuperAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ previous_match_time: null, time_changed_at: null })
    .eq("id", matchId);

  if (error) throw new Error(error.message);

  revalidatePath("/nominations");
}

export async function setMatchReferee(
  matchId: string,
  slot: 1 | 2,
  refereeId: string | null,
) {
  await requireSuperAdmin();

  const supabase = await createClient();
  const field = slot === 1 ? "referee1_id" : "referee2_id";
  const statusField = slot === 1 ? "referee1_status" : "referee2_status";

  const { error } = await supabase
    .from("matches")
    .update({ [field]: refereeId, [statusField]: "draft", updated_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) throw new Error(error.message);

  revalidatePath("/nominations");
}

export type NominationStatus = "draft" | "sent" | "confirmed" | "rejected";

/** Rozhodca potvrdí alebo zamietne vlastnú (odoslanú) nomináciu. */
export async function respondToNomination(
  matchId: string,
  response: "confirmed" | "rejected",
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Pre túto akciu sa musíš prihlásiť.");
  }

  const { error } = await supabase.rpc("respond_to_nomination", {
    p_match_id: matchId,
    p_response: response,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/nominations");
}

export async function setMatchRefereeStatus(
  matchId: string,
  slot: 1 | 2,
  status: NominationStatus,
) {
  await requireSuperAdmin();

  const supabase = await createClient();
  const field = slot === 1 ? "referee1_status" : "referee2_status";

  const { error } = await supabase
    .from("matches")
    .update({ [field]: status, updated_at: new Date().toISOString() })
    .eq("id", matchId);

  if (error) throw new Error(error.message);

  revalidatePath("/nominations");
}
