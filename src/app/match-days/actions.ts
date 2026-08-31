"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/categories";

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
