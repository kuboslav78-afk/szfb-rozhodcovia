import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Je testovací modul sprístupnený rozhodcom? Kým KRO neprejde banku otázok,
 * modul vidí len administrátor a v menu ostáva označený ako "Čoskoro".
 */
export async function isTestingEnabled(supabase: SupabaseClient): Promise<boolean> {
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", "testing_enabled")
    .maybeSingle();

  return data?.value === "true";
}
