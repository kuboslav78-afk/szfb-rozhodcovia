"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { scrapeVenues } from "@/lib/szfb-venues";

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
    throw new Error("Adresár hál môže aktualizovať len administrátor.");
  }

  return supabase;
}

/** Stiahne adresár hál zo szfb.sk a prepíše ním lokálnu kópiu. */
export async function syncVenues() {
  const supabase = await requireSuperAdmin();

  const scraped = await scrapeVenues();
  if (scraped.length === 0) {
    throw new Error("Zo szfb.sk sa nenačítala žiadna hala — zmenila sa štruktúra stránky?");
  }

  const { error } = await supabase.from("venues").upsert(
    scraped.map((v) => ({
      name: v.name,
      match_key: v.matchKey,
      street: v.street,
      city: v.city,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "name" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/dostupnost");
  return { total: scraped.length };
}
