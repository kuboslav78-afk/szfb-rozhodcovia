import type { SupabaseClient } from "@supabase/supabase-js";

export async function getPendingNominationCount(
  supabase: SupabaseClient,
  refereeId: string,
): Promise<number> {
  const { count } = await supabase
    .from("matches")
    .select("id", { count: "exact", head: true })
    .or(
      `and(referee1_id.eq.${refereeId},referee1_status.eq.sent),and(referee2_id.eq.${refereeId},referee2_status.eq.sent)`,
    );

  return count ?? 0;
}
