import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { ComingSoonSection } from "@/components/ComingSoonSection";
import { getPendingNominationCount } from "@/lib/nominations";

export default async function TestovaniePage() {
  const referee = await requireUser();
  const supabase = await createClient();
  const isSuperAdmin = referee.role === "admin";
  const pendingNominations = await getPendingNominationCount(supabase, referee.id);

  return (
    <div className="lg:flex">
      <Sidebar
        current="testovanie"
        refereeName={referee.full_name}
        roleLabel={isSuperAdmin ? "Administrátor" : referee.role === "viewer" ? "Viewer" : null}
        isAdmin={isSuperAdmin}
        pendingNominations={pendingNominations}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10">
          <ComingSoonSection title="Testovanie" />
        </main>
      </div>
    </div>
  );
}
