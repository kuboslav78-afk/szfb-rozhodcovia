import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { PageTitle } from "@/components/PageTitle";
import { EarningsBreakdown } from "@/components/EarningsBreakdown";
import { getEarningEntries } from "@/lib/earnings";
import { getPendingNominationCount } from "@/lib/nominations";
import { getEffectiveIsAdmin, isRefereeViewActive } from "@/lib/view-mode";
import { getCategoryAccess } from "@/lib/category-access";

export default async function OdmenyPage() {
  const referee = await requireUser();
  const supabase = await createClient();

  const realIsAdmin = referee.role === "admin";
  const isSuperAdmin = await getEffectiveIsAdmin(referee.role);
  const isViewer = referee.role === "viewer";
  const refereeView = await isRefereeViewActive();

  const categoryAccess = isViewer
    ? { visible: [], editable: [] }
    : await getCategoryAccess(supabase, referee.id, realIsAdmin);
  const hasAdminAccess = categoryAccess.visible.length > 0;

  // Prehľad za všetkých vidí len ten, kto má administratívny prístup a nie je
  // prepnutý do náhľadu rozhodcu; ostatní vidia výhradne svoje zápasy.
  const showEveryone = (hasAdminAccess && !refereeView) || isViewer;
  const entries = await getEarningEntries(
    supabase,
    showEveryone ? undefined : referee.id,
  );

  const pendingNominations = await getPendingNominationCount(supabase, referee.id);

  const { count: myCategoryCount } = await supabase
    .from("referee_categories")
    .select("category", { count: "exact", head: true })
    .eq("referee_id", referee.id);

  const isActiveReferee = (myCategoryCount ?? 0) > 0 || referee.home_region !== null;

  return (
    <div className="lg:flex">
      <Sidebar
        current="odmeny"
        refereeName={referee.full_name}
        roleLabel={
          realIsAdmin
            ? isSuperAdmin
              ? "Administrátor"
              : "Administrátor · náhľad rozhodcu"
            : isViewer
              ? "Viewer"
              : null
        }
        isAdmin={isSuperAdmin}
        canSeeKro={isSuperAdmin || isViewer}
        pendingNominations={pendingNominations}
        canToggleView={realIsAdmin || (hasAdminAccess && isActiveReferee)}
        viewMode={refereeView || !hasAdminAccess ? "referee" : "admin"}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
          <PageTitle className="mb-1">Odmeny</PageTitle>
          <p className="mb-8 text-sm text-zinc-400">
            {showEveryone
              ? "Odmeny všetkých rozhodcov po mesiacoch, z potvrdených nominácií."
              : "Tvoje odmeny po mesiacoch. Rozklikni mesiac a uvidíš jednotlivé zápasy."}
          </p>

          <EarningsBreakdown entries={entries} showReferee={showEveryone} />
        </main>
      </div>
    </div>
  );
}
