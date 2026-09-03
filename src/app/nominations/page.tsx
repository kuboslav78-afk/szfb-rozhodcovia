import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { PageTitle } from "@/components/PageTitle";
import { NominationCategoryTabs } from "@/components/NominationCategoryTabs";
import { COMPETITIONS } from "@/lib/szfb-scraper";
import { NominationsManager } from "@/components/NominationsManager";
import { MyNominations, type MyNomination } from "@/components/MyNominations";
import { getPendingNominationCount } from "@/lib/nominations";
import { getEffectiveIsAdmin } from "@/lib/view-mode";
import { CATEGORIES, CATEGORY_LABELS, parseCategoryParam, type Category } from "@/lib/categories";

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NominationsPage(props: PageProps<"/nominations">) {
  const searchParamsRaw = await props.searchParams;

  const referee = await requireUser();
  const supabase = await createClient();
  const realIsAdmin = referee.role === "admin";
  const isEffectiveAdmin = await getEffectiveIsAdmin(referee.role);
  const isViewerRole = referee.role === "viewer";

  const pendingNominations = await getPendingNominationCount(supabase, referee.id);

  let myAdminCategories: Category[] = [];
  if (!realIsAdmin && !isViewerRole) {
    const { data } = await supabase.from("category_admins").select("category").eq("referee_id", referee.id);
    myAdminCategories = (data ?? []).map((r) => r.category as Category);
  }

  // Plný admin a viewer vidia (viewer len na čítanie) všetky regióny;
  // regionálny admin (category_admins) len tie svoje. Keď je v UI "náhľad
  // rozhodcu", správca sa vôbec nedostane do admin vetvy — vidí "Moje nominácie".
  const allowedCategories: Category[] = realIsAdmin || isViewerRole ? [...CATEGORIES] : myAdminCategories;
  const canManageNominations = isEffectiveAdmin || isViewerRole || myAdminCategories.length > 0;
  const readOnly = isViewerRole;

  const requestedCategory = parseCategoryParam(singleParam(searchParamsRaw.category));
  const category: Category = allowedCategories.includes(requestedCategory)
    ? requestedCategory
    : (allowedCategories[0] ?? "celostatny");

  if (!canManageNominations) {
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
          roleLabel={
            realIsAdmin ? "Administrátor · náhľad rozhodcu" : referee.role === "viewer" ? "Viewer" : null
          }
          isAdmin={false}
          canSeeKro={isViewerRole}
          pendingNominations={pendingNominations}
          canToggleView={realIsAdmin}
          viewMode="referee"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-10">
            <PageTitle className="mb-6">Moje nominácie</PageTitle>
            <MyNominations nominations={nominations} />
          </main>
        </div>
      </div>
    );
  }

  const [{ data: matches }, { data: categoryRefRows }] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .eq("category", category)
      .order("match_date")
      .order("match_time"),
    supabase.from("referee_categories").select("referee_id").eq("category", category),
  ]);

  const categoryRefIds = (categoryRefRows ?? []).map((r) => r.referee_id as string);

  const [{ data: referees }, { data: availabilityRows }] = await Promise.all([
    categoryRefIds.length
      ? supabase
          .from("referees")
          .select("id, full_name, license_level")
          .in("id", categoryRefIds)
          .eq("active", true)
          .order("full_name")
      : Promise.resolve({ data: [] }),
    categoryRefIds.length
      ? supabase
          .from("availability")
          .select("referee_id, available_date, status, reason, available_from, available_to")
          .eq("category", category)
          .in("referee_id", categoryRefIds)
      : Promise.resolve({ data: [] }),
  ]);

  const competitions = COMPETITIONS.filter((c) => c.category === category);

  const roleLabel = realIsAdmin
    ? "Administrátor"
    : isViewerRole
      ? "Viewer"
      : `Regionálny admin · ${allowedCategories.map((c) => CATEGORY_LABELS[c]).join(", ")}`;

  return (
    <div className="lg:flex">
      <Sidebar
        current="nominacie"
        refereeName={referee.full_name}
        roleLabel={roleLabel}
        isAdmin={isEffectiveAdmin}
        canSeeKro={isEffectiveAdmin || isViewerRole}
        pendingNominations={pendingNominations}
        canToggleView={realIsAdmin}
        viewMode="admin"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10">
          <PageTitle className="mb-6">Nominácie{readOnly ? " · len na čítanie" : ""}</PageTitle>
          <NominationCategoryTabs active={category} allowed={allowedCategories} />
          <NominationsManager
            key={category}
            competitions={competitions}
            readOnly={readOnly}
            initialMatches={matches ?? []}
            referees={referees ?? []}
            availability={availabilityRows ?? []}
          />
        </main>
      </div>
    </div>
  );
}
