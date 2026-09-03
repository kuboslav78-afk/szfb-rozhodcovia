"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/categories";
import { getCategoryAccess } from "@/lib/category-access";
import { syncMatchDaysFromMatches } from "@/lib/match-days";

export async function setMatchDay(
  date: string,
  isMatchDay: boolean,
  category: Category,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Pre túto akciu sa musíš prihlásiť.");
  }

  if (isMatchDay) {
    const { error } = await supabase
      .from("match_days")
      .upsert(
        { match_date: date, category },
        { onConflict: "match_date,category" },
      );

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("match_days")
      .delete()
      .eq("match_date", date)
      .eq("category", category);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function setMatchDayLeagues(
  date: string,
  category: Category,
  leagues: string[],
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Pre túto akciu sa musíš prihlásiť.");
  }

  const { error } = await supabase
    .from("match_days")
    .update({ leagues })
    .eq("match_date", date)
    .eq("category", category);

  if (error) throw new Error(error.message);

  revalidatePath("/");
}

/**
 * Jednorazovo dopočíta hracie dni a ligy zo zápasov, ktoré už sú v databáze —
 * bez sťahovania zo szfb.sk. Pri importe sa to deje samo, toto je na dobehnutie
 * dní, ktoré vznikli pred zavedením automatiky.
 */
export async function syncMatchDaysFromNominations(category: Category) {
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
    const access = await getCategoryAccess(supabase, user.id, false);
    if (!access.editable.includes(category)) {
      throw new Error("V tejto kategórii nemáš právo upravovať.");
    }
  }

  const result = await syncMatchDaysFromMatches(supabase, category);

  revalidatePath("/dostupnost");
  return result;
}
