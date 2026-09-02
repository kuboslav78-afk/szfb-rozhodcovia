"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { VIEW_MODE_COOKIE } from "@/lib/view-mode";

/** Prepnutie "pohľadu" pre administrátora — len UI náhľad, nie zmena oprávnení. */
export async function setViewMode(mode: "admin" | "referee") {
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

  const store = await cookies();
  if (mode === "referee") {
    store.set(VIEW_MODE_COOKIE, "referee", { path: "/", maxAge: 60 * 60 * 24 * 30 });
  } else {
    store.delete(VIEW_MODE_COOKIE);
  }

  revalidatePath("/", "layout");
}
