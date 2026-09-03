import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { ComingSoonSection } from "@/components/ComingSoonSection";
import { getPendingNominationCount } from "@/lib/nominations";
import { getEffectiveIsAdmin } from "@/lib/view-mode";

export default async function VzdelavaniePage() {
  const referee = await requireUser();
  const supabase = await createClient();
  const realIsAdmin = referee.role === "admin";
  const isSuperAdmin = await getEffectiveIsAdmin(referee.role);
  const pendingNominations = await getPendingNominationCount(supabase, referee.id);

  return (
    <div className="lg:flex">
      <Sidebar
        current="vzdelavanie"
        refereeName={referee.full_name}
        roleLabel={
          realIsAdmin
            ? isSuperAdmin
              ? "Administrátor"
              : "Administrátor · náhľad rozhodcu"
            : referee.role === "viewer"
              ? "Viewer"
              : null
        }
        isAdmin={isSuperAdmin}
        canSeeKro={isSuperAdmin || referee.role === "viewer"}
        pendingNominations={pendingNominations}
        canToggleView={realIsAdmin}
        viewMode={isSuperAdmin ? "admin" : "referee"}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10">
          <ComingSoonSection title="Vzdelávanie" />
        </main>
      </div>
    </div>
  );
}
