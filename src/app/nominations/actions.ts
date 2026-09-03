"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { COMPETITIONS, scrapeCompetition } from "@/lib/szfb-scraper";
import { sendEmail, sendBatchEmails, nominationSentEmailHtml } from "@/lib/email";
import { geocodeVenuesBatch } from "@/lib/geocoding";
import { CATEGORIES, type Category } from "@/lib/categories";

type NominationAdmin = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  isSuperAdmin: boolean;
  /** Kategórie, ktoré smie spravovať — super admin má všetky. */
  categories: Category[];
};

/**
 * Nominácie smie spravovať super admin (referees.role = 'admin') alebo regionálny
 * admin (riadok v category_admins) — ten však len vo svojich kategóriách. RLS na
 * tabuľke matches to už dovoľuje (matches_write_admin), tieto kontroly sú tu preto,
 * aby zamietnutie prišlo ako zrozumiteľná hláška a nie ako tichý zápis do nuly riadkov.
 */
async function requireNominationAdmin(): Promise<NominationAdmin> {
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

  if (referee?.role === "admin") {
    return { supabase, userId: user.id, isSuperAdmin: true, categories: [...CATEGORIES] };
  }

  const { data: adminRows } = await supabase
    .from("category_admins")
    .select("category")
    .eq("referee_id", user.id);

  const categories = (adminRows ?? []).map((r) => r.category as Category);

  if (categories.length === 0) {
    throw new Error("Túto akciu môže vykonať len administrátor.");
  }

  return { supabase, userId: user.id, isSuperAdmin: false, categories };
}

/** Prístup ku konkrétnej kategórii (súťaž, ručne pridávaný zápas). */
async function requireCategoryAdmin(category: string): Promise<NominationAdmin> {
  const admin = await requireNominationAdmin();

  if (!admin.categories.includes(category as Category)) {
    throw new Error("Túto kategóriu spravuje iný administrátor.");
  }

  return admin;
}

/** Prístup k existujúcemu zápasu — kategóriu si dohľadá sám. */
async function requireMatchAdmin(matchId: string): Promise<NominationAdmin> {
  const admin = await requireNominationAdmin();

  const { data: match } = await admin.supabase
    .from("matches")
    .select("category")
    .eq("id", matchId)
    .maybeSingle();

  if (!match) {
    throw new Error("Zápas sa nenašiel.");
  }

  if (!admin.categories.includes(match.category as Category)) {
    throw new Error("Tento zápas spravuje iný administrátor.");
  }

  return admin;
}

/** Len super admin — akcie zasahujúce do dát mimo jednej kategórie. */
async function requireSuperAdmin() {
  const admin = await requireNominationAdmin();

  if (!admin.isSuperAdmin) {
    throw new Error("Túto akciu môže vykonať len administrátor.");
  }

  return admin;
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
  const toNotify: {
    refereeId: string;
    referee1Id: string | null;
    referee2Id: string | null;
    match: (typeof scraped)[number];
  }[] = [];

  for (const match of scraped) {
    const { data: existing } = await supabase
      .from("matches")
      .select("id, match_date, match_time, referee1_id, referee1_status, referee2_id, referee2_status")
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
      // Ak sa oproti predošlému importu zmenil dátum a/alebo čas, označíme to
      // na zvýraznenie v appke — kým to admin nepotvrdí (acknowledgeTimeChange).
      // Rozhodcovia, ktorí už mali nomináciu potvrdenú na starý termín, ju musia
      // znova schváliť — vrátime im stav na "sent" (odoslaná, čaká na potvrdenie).
      // Postgres "time" stĺpec sa vracia ako "HH:MM:SS", scraper dáva "HH:MM" —
      // porovnávame len prvých 5 znakov, aby sa rovnaký čas nepovažoval za zmenu.
      const existingTime = existing.match_time?.slice(0, 5) ?? null;
      const timeChanged = existingTime !== null && existingTime !== match.matchTime;
      const dateChanged = existing.match_date !== match.matchDate;

      if (timeChanged || dateChanged) {
        if (timeChanged) row.previous_match_time = existing.match_time;
        if (dateChanged) row.previous_match_date = existing.match_date;
        row.time_changed_at = new Date().toISOString();

        if (existing.referee1_id && existing.referee1_status === "confirmed") {
          row.referee1_status = "sent";
          toNotify.push({
            refereeId: existing.referee1_id,
            referee1Id: existing.referee1_id,
            referee2Id: existing.referee2_id,
            match,
          });
        }
        if (existing.referee2_id && existing.referee2_status === "confirmed") {
          row.referee2_status = "sent";
          toNotify.push({
            refereeId: existing.referee2_id,
            referee1Id: existing.referee1_id,
            referee2Id: existing.referee2_id,
            match,
          });
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

  if (toNotify.length > 0) {
    const allIds = Array.from(
      new Set(toNotify.flatMap((n) => [n.refereeId, n.referee1Id, n.referee2Id].filter((id): id is string => Boolean(id)))),
    );
    const { data: refs } = await supabase.from("referees").select("id, full_name, email").in("id", allIds);
    const byId = new Map((refs ?? []).map((r) => [r.id, r]));

    const emails = toNotify
      .map(({ refereeId, referee1Id, referee2Id, match }) => {
        const ref = byId.get(refereeId);
        if (!ref?.email) return null;
        return {
          to: ref.email,
          subject: `Zmena termínu zápasu — potvrď nomináciu znova (${match.teamHome} vs ${match.teamAway})`,
          html: nominationSentEmailHtml({
            refereeName: ref.full_name,
            teamHome: match.teamHome,
            teamAway: match.teamAway,
            matchDate: match.matchDate,
            matchTime: match.matchTime,
            venue: match.venue,
            league: competition.league,
            referee1Name: referee1Id ? (byId.get(referee1Id)?.full_name ?? null) : null,
            referee2Name: referee2Id ? (byId.get(referee2Id)?.full_name ?? null) : null,
            reason: "time_changed",
          }),
        };
      })
      .filter((e): e is NonNullable<typeof e> => e !== null);

    try {
      await sendBatchEmails(emails);
    } catch {
      // E-mail sa nepodarilo odoslať — import aj tak prebehol, nominácie sú
      // korektne v stave "sent", KRO to uvidí aj priamo v appke.
    }
  }

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

export type ManualMatchCreateInput = {
  category: string;
  league: string;
  teamHome: string;
  teamAway: string;
  matchDate: string;
  matchTime: string | null;
  venue: string | null;
  matchNumber: number | null;
};

/** Ručné pridanie zápasu, ktorý nejde cez szfb.sk import (napr. reprezentačné priateľáky, žiadosť len e-mailom). */
export async function createManualMatch(input: ManualMatchCreateInput) {
  await requireSuperAdmin();

  if (!input.league.trim() || !input.teamHome.trim() || !input.teamAway.trim() || !input.matchDate) {
    throw new Error("Vyplň ligu, oba tímy a dátum zápasu.");
  }

  const supabase = await createClient();
  const externalMatchId = `manual-${crypto.randomUUID()}`;

  const { error } = await supabase.from("matches").insert({
    category: input.category,
    league: input.league.trim(),
    external_competition_id: "manual",
    external_match_id: externalMatchId,
    match_number: input.matchNumber,
    round: null,
    team_home: input.teamHome.trim(),
    team_away: input.teamAway.trim(),
    match_date: input.matchDate,
    match_time: input.matchTime,
    venue: input.venue,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/nominations");
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
    .select(
      "match_date, match_time, team_home, team_away, league, referee1_id, referee1_status, referee2_id, referee2_status",
    )
    .eq("id", matchId)
    .single();

  if (fetchError || !existing) throw new Error("Zápas sa nenašiel.");

  const row: Record<string, unknown> = {
    match_date: input.matchDate,
    match_time: input.matchTime,
    venue: input.venue,
    updated_at: new Date().toISOString(),
  };

  const notifyRefereeIds: string[] = [];

  const timeChanged = existing.match_time !== null && existing.match_time !== input.matchTime;
  const dateChanged = existing.match_date !== input.matchDate;

  if (timeChanged || dateChanged) {
    if (timeChanged) row.previous_match_time = existing.match_time;
    if (dateChanged) row.previous_match_date = existing.match_date;
    row.time_changed_at = new Date().toISOString();

    if (existing.referee1_id && existing.referee1_status === "confirmed") {
      row.referee1_status = "sent";
      notifyRefereeIds.push(existing.referee1_id);
    }
    if (existing.referee2_id && existing.referee2_status === "confirmed") {
      row.referee2_status = "sent";
      notifyRefereeIds.push(existing.referee2_id);
    }
  }

  const { error } = await supabase.from("matches").update(row).eq("id", matchId);
  if (error) throw new Error(error.message);

  revalidatePath("/nominations");

  if (notifyRefereeIds.length > 0) {
    const bothIds = [existing.referee1_id, existing.referee2_id].filter(
      (id): id is string => Boolean(id),
    );
    const { data: refs } = await supabase
      .from("referees")
      .select("id, full_name, email")
      .in("id", bothIds);

    const byId = new Map((refs ?? []).map((r) => [r.id, r]));

    for (const refereeId of notifyRefereeIds) {
      const ref = byId.get(refereeId);
      if (!ref?.email) continue;
      const partnerId = existing.referee1_id === refereeId ? existing.referee2_id : existing.referee1_id;
      const partner = partnerId ? byId.get(partnerId) : null;
      const isSlot1 = existing.referee1_id === refereeId;
      const referee1Name = isSlot1 ? ref.full_name : (partner?.full_name ?? null);
      const referee2Name = isSlot1 ? (partner?.full_name ?? null) : ref.full_name;
      try {
        await sendEmail({
          to: ref.email,
          subject: `Zmena termínu zápasu — potvrď nomináciu znova (${existing.team_home} vs ${existing.team_away})`,
          html: nominationSentEmailHtml({
            refereeName: ref.full_name,
            teamHome: existing.team_home,
            teamAway: existing.team_away,
            matchDate: input.matchDate,
            matchTime: input.matchTime,
            venue: input.venue,
            league: existing.league,
            reason: "time_changed",
            referee1Name,
            referee2Name,
          }),
        });
      } catch {
        // Zápas je aj tak správne upravený, e-mail je len doplnkové upozornenie.
      }
    }
  }
}

/** Admin potvrdí, že si všimol zmenu termínu (dátumu a/alebo času) — zruší zvýraznenie. */
export async function acknowledgeTimeChange(matchId: string) {
  await requireSuperAdmin();

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ previous_match_time: null, previous_match_date: null, time_changed_at: null })
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

  if (status === "sent") {
    const { data: match } = await supabase
      .from("matches")
      .select("team_home, team_away, match_date, match_time, venue, league, referee1_id, referee2_id")
      .eq("id", matchId)
      .single();

    const refereeId = match ? (slot === 1 ? match.referee1_id : match.referee2_id) : null;
    const partnerId = match ? (slot === 1 ? match.referee2_id : match.referee1_id) : null;

    if (match && refereeId) {
      const partnerIds = [refereeId, ...(partnerId ? [partnerId] : [])];
      const { data: refs } = await supabase
        .from("referees")
        .select("id, full_name, email")
        .in("id", partnerIds);

      const ref = refs?.find((r) => r.id === refereeId);
      const partner = partnerId ? refs?.find((r) => r.id === partnerId) : null;
      const referee1Name = slot === 1 ? (ref?.full_name ?? null) : (partner?.full_name ?? null);
      const referee2Name = slot === 2 ? (ref?.full_name ?? null) : (partner?.full_name ?? null);

      if (ref?.email) {
        try {
          await sendEmail({
            to: ref.email,
            subject: `Nová nominácia — ${match.team_home} vs ${match.team_away}`,
            html: nominationSentEmailHtml({
              refereeName: ref.full_name,
              teamHome: match.team_home,
              teamAway: match.team_away,
              matchDate: match.match_date,
              matchTime: match.match_time,
              venue: match.venue,
              league: match.league,
              reason: "new",
              referee1Name,
              referee2Name,
            }),
          });
        } catch {
          // Nominácia je aj tak korektne odoslaná, e-mail je len doplnkové upozornenie.
        }
      }
    }
  }
}

/**
 * Geokóduje ďalšiu dávku hál bez súradníc (Nominatim dovoľuje len 1 req/s,
 * takže sa to volá opakovane z klienta, kým `remaining` neklesne na 0).
 * Súradnice sa používajú na odhad, či rozhodca stihne dva zápasy za deň.
 */
export async function geocodeVenues() {
  await requireSuperAdmin();
  return geocodeVenuesBatch();
}
