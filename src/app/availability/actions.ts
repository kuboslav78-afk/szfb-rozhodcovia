"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { daysUntil } from "@/lib/dates";
import type { Category } from "@/lib/categories";

export type AvailabilityStatus = "available" | "unavailable" | "limited";

const LOCK_THRESHOLD_DAYS = 5;

export async function setAvailability(
  date: string,
  category: Category,
  status: AvailabilityStatus | null,
  reason?: string | null,
  availableFrom?: string | null,
  availableTo?: string | null,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Pre túto akciu sa musíš prihlásiť.");
  }

  const { data: existing } = await supabase
    .from("availability")
    .select("id")
    .eq("referee_id", user.id)
    .eq("available_date", date)
    .eq("category", category)
    .maybeSingle();

  if (existing && daysUntil(date) < LOCK_THRESHOLD_DAYS) {
    throw new Error(
      "Do termínu zostáva menej ako 5 dní — priama zmena už nie je možná. Použi žiadosť o zrušenie.",
    );
  }

  if (status === null) {
    const { error } = await supabase
      .from("availability")
      .delete()
      .eq("referee_id", user.id)
      .eq("available_date", date)
      .eq("category", category);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("availability").upsert(
      {
        referee_id: user.id,
        available_date: date,
        category,
        status,
        reason: status === "limited" ? (reason ?? null) : null,
        available_from: status === "limited" ? (availableFrom ?? null) : null,
        available_to: status === "limited" ? (availableTo ?? null) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "referee_id,available_date,category" },
    );

    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
}

export async function requestCancellation(date: string, category: Category) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Pre túto akciu sa musíš prihlásiť.");
  }

  const { error } = await supabase
    .from("availability")
    .update({
      cancel_requested: true,
      cancel_requested_at: new Date().toISOString(),
    })
    .eq("referee_id", user.id)
    .eq("available_date", date)
    .eq("category", category);

  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function resolveCancellationRequest(
  refereeId: string,
  date: string,
  category: Category,
  approve: boolean,
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Pre túto akciu sa musíš prihlásiť.");
  }

  if (approve) {
    const { error } = await supabase
      .from("availability")
      .delete()
      .eq("referee_id", refereeId)
      .eq("available_date", date)
      .eq("category", category);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase
      .from("availability")
      .update({ cancel_requested: false, cancel_requested_at: null })
      .eq("referee_id", refereeId)
      .eq("available_date", date)
      .eq("category", category);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
}
