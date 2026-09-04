"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TimeType } from "@/lib/rates";

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
    throw new Error("Sadzobník môže upravovať len administrátor.");
  }

  return supabase;
}

export type LeagueRateInput = {
  time_type: TimeType;
  fee: number | null;
  travel_supplement: number | null;
  fee_hruby: number | null;
  fee_cisty: number | null;
  meal_hruby: number | null;
  meal_cisty: number | null;
  max_per_day_hruby: number | null;
  max_per_day_cisty: number | null;
};

export async function updateLeagueRate(league: string, input: LeagueRateInput) {
  const supabase = await requireSuperAdmin();

  const { error } = await supabase
    .from("league_rates")
    .upsert(
      { league, ...input, updated_at: new Date().toISOString() },
      { onConflict: "league" },
    );

  if (error) throw new Error(error.message);

  revalidatePath("/dostupnost");
}

/** Minimálna hodinová mzda sa mení každý rok — vstupuje do dobrovoľníckeho výkazu. */
export async function updateMinHourlyWage(value: number) {
  const supabase = await requireSuperAdmin();

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Minimálna hodinová mzda musí byť kladné číslo.");
  }

  const { error } = await supabase
    .from("payout_settings")
    .upsert(
      { key: "min_hourly_wage", value, updated_at: new Date().toISOString() },
      { onConflict: "key" },
    );

  if (error) throw new Error(error.message);

  revalidatePath("/dostupnost");
}
