import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { COMPETITIONS } from "@/lib/szfb-scraper";
import { NominationsManager } from "@/components/NominationsManager";
import { MyNominations, type MyNomination } from "@/components/MyNominations";
import { getPendingNominationCount } from "@/lib/nominations";

export default async function NominationsPage() {
  const referee = await requireUser();
  const supabase = await createClient();
  const isSuperAdmin = referee.role === "admin";

  const pendingNominations = await getPendingNominationCount(supabase, referee.id);

  if (!isSuperAdmin) {
    const { data: matches } = await supabase
      .from("matches")
      .select(
        "id, match_number, league, team_home, team_away, match_date, match_time, venue, referee1_id, referee1_status, referee2_id, referee2_status",
      )
      .or(
        `and(referee1_id.eq.${referee.id},referee1_status.neq.draft),and(referee2_id.eq.${referee.id},referee2_status.neq.draft)`,
      )
      .order("match_date")
      .order("match_time");

    const partnerIds = Array.from(
      new Set(
        (matches ?? [])
          .map((m) => (m.referee1_id === referee.id ? m.referee2_id : m.referee1_id))
          .filter((id): id is string => Boolean(id)),
      ),
    );

    const { data: partnerRows } = partnerIds.length
      ? await supabase.from("referees").select("id, full_name").in("id", partnerIds)
      : { data: [] };
    const partnerNames = new Map((partnerRows ?? []).map((r) => [r.id, r.full_name as string]));

    const nominations: MyNomination[] = (matches ?? []).map((m) => {
      const isSlot1 = m.referee1_id === referee.id;
      const partnerId = isSlot1 ? m.referee2_id : m.referee1_id;
      return {
        id: m.id,
        matchNumber: m.match_number,
        league: m.league,
        teamHome: m.team_home,
        teamAway: m.team_away,
        matchDate: m.match_date,
        matchTime: m.match_time,
        venue: m.venue,
        myStatus: (isSlot1 ? m.referee1_status : m.referee2_status) as MyNomination["myStatus"],
        partnerName: partnerId ? (partnerNames.get(partnerId) ?? null) : null,
      };
    });

    return (
      <div className="lg:flex">
        <Sidebar
          current="nominacie"
          refereeName={referee.full_name}
          roleLabel={referee.role === "viewer" ? "Viewer" : null}
          isAdmin={false}
          pendingNominations={pendingNominations}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
            <h1 className="mb-6 text-lg font-semibold text-zinc-800 dark:text-zinc-100">
              Moje nominácie
            </h1>
            <MyNominations nominations={nominations} />
          </main>
        </div>
      </div>
    );
  }

  const [{ data: matches }, { data: celostatnyRefRows }] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .order("match_date")
      .order("match_time"),
    supabase.from("referee_categories").select("referee_id").eq("category", "celostatny"),
  ]);

  const celostatnyIds = (celostatnyRefRows ?? []).map((r) => r.referee_id as string);

  const [{ data: referees }, { data: availabilityRows }] = await Promise.all([
    celostatnyIds.length
      ? supabase
          .from("referees")
          .select("id, full_name, license_level")
          .in("id", celostatnyIds)
          .eq("active", true)
          .order("full_name")
      : Promise.resolve({ data: [] }),
    celostatnyIds.length
      ? supabase
          .from("availability")
          .select("referee_id, available_date, status, reason, available_from, available_to")
          .eq("category", "celostatny")
          .in("referee_id", celostatnyIds)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <div className="lg:flex">
      <Sidebar
        current="nominacie"
        refereeName={referee.full_name}
        roleLabel="Administrátor"
        isAdmin={isSuperAdmin}
        pendingNominations={pendingNominations}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10">
          <h1 className="mb-6 text-lg font-semibold text-zinc-800 dark:text-zinc-100">
            Nominácie
          </h1>
          <NominationsManager
            competitions={COMPETITIONS}
            initialMatches={matches ?? []}
            referees={referees ?? []}
            availability={availabilityRows ?? []}
          />
        </main>
      </div>
    </div>
  );
}
