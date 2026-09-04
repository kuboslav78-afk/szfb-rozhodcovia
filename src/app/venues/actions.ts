"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { scrapeVenues, scrapeVenueAddress } from "@/lib/szfb-venues";

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
      detail_url: v.detailUrl,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "name" },
  );

  if (error) throw new Error(error.message);

  revalidatePath("/dostupnost");
  return { total: scraped.length };
}

/**
 * Doplní plné adresy (ulica so súpisným číslom a PSČ) z detailov hál. Je to jedna
 * požiadavka na halu, takže sa to robí po dávkach — volaj opakovane, kým `remaining`
 * neklesne na 0. Medzi požiadavkami je pauza, nech szfb.sk nezaťažujeme nárazovo.
 */
export async function fetchVenueAddresses(limit = 25) {
  const supabase = await requireSuperAdmin();

  const { data: pending } = await supabase
    .from("venues")
    .select("name, detail_url")
    .is("full_address", null)
    .not("detail_url", "is", null)
    .order("name")
    .limit(limit);

  const batch = pending ?? [];
  let filled = 0;
  let failed = 0;

  for (const venue of batch) {
    const address = await scrapeVenueAddress(venue.detail_url as string);

    if (address) {
      await supabase
        .from("venues")
        .update({ full_address: address, updated_at: new Date().toISOString() })
        .eq("name", venue.name);
      filled++;
    } else {
      failed++;
    }

    await new Promise((resolve) => setTimeout(resolve, 120));
  }

  const { count: remaining } = await supabase
    .from("venues")
    .select("name", { count: "exact", head: true })
    .is("full_address", null)
    .not("detail_url", "is", null);

  revalidatePath("/dostupnost");
  return { processed: batch.length, filled, failed, remaining: remaining ?? 0 };
}
