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
      .select("id")
      .eq("external_competition_id", competition.id)
      .eq("external_match_id", match.externalMatchId)
      .maybeSingle();

    const row = {
      category: competition.category,
      league: competition.league,
      external_competition_id: competition.id,
      external_match_id: match.externalMatchId,
      round: match.round,
      team_home: match.teamHome,
      team_away: match.teamAway,
      match_date: match.matchDate,
      match_time: match.matchTime,
      venue: match.venue,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
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
