import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Je prihlásený používateľ členom KRO? Členstvo je samostatný príznak — nestačí
 * kategóriový prístup, ten majú aj ľudia mimo komisie (nominačné oddelenie).
 * Členovia komisie nevypĺňajú testy a vidia banku otázok aj výsledky všetkých.
 */
export async function isKroMember(
  supabase: SupabaseClient,
  refereeId: string,
  role: string,
): Promise<boolean> {
  if (role === "admin" || role === "viewer") return true;

  const { data } = await supabase
    .from("referees")
    .select("kro_member")
    .eq("id", refereeId)
    .maybeSingle();

  return Boolean(data?.kro_member);
}
