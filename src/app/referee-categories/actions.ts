"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/categories";

/** Admin prideľuje/odoberá ktorúkoľvek kategóriu (vrátane "celoštátny") ktorémukoľvek rozhodcovi. */
export async function adminSetRefereeCategory(
  refereeId: string,
  category: Category,
  enabled: boolean,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Pre túto akciu sa musíš prihlásiť.");
  }

  if (enabled) {
    const { error } = await supabase
      .from("referee_categories")
      .upsert(
        { referee_id: refereeId, category },
        { onConflict: "referee_id,category" },
      );

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("referee_categories")
      .delete()
      .eq("referee_id", refereeId)
      .eq("category", category);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
}

/** Rozhodca si sám pridá/odoberie SVOJ región (nie "celoštátny", to udeľuje len admin). */
export async function setMyRegion(category: Category, enabled: boolean) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Pre túto akciu sa musíš prihlásiť.");
  }

  if (category === "celostatny") {
    throw new Error("Celoštátny štatút prideľuje administrátor.");
  }

  if (enabled) {
    const { error } = await supabase
      .from("referee_categories")
      .upsert(
        { referee_id: user.id, category },
        { onConflict: "referee_id,category" },
      );

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("referee_categories")
      .delete()
      .eq("referee_id", user.id)
      .eq("category", category);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
}
