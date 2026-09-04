import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { PageTitle } from "@/components/PageTitle";
import { EmailComposer } from "@/components/EmailComposer";
import { listAllReferees } from "@/app/kro/actions";
import { getPendingNominationCount } from "@/lib/nominations";
import { getEffectiveIsAdmin } from "@/lib/view-mode";
import { isTestingEnabled } from "@/lib/settings";

export default async function KroEmailPage() {
  const referee = await requireUser();
  if (referee.role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();

  const testingEnabled = await isTestingEnabled(supabase);
  const isSuperAdmin = await getEffectiveIsAdmin(referee.role);
  const pendingNominations = await getPendingNominationCount(supabase, referee.id);
  const referees = await listAllReferees();

  return (
    <div className="lg:flex">
      <Sidebar
        current="kro"
        refereeName={referee.full_name}
        roleLabel={isSuperAdmin ? "Administrátor" : "Administrátor · náhľad rozhodcu"}
        isAdmin={isSuperAdmin}
        pendingNominations={pendingNominations}
        canToggleView={true}
        viewMode={isSuperAdmin ? "admin" : "referee"}
        testingEnabled={testingEnabled}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
          <Link href="/kro" className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            ← Späť na KRO
          </Link>
          <PageTitle className="mb-8">Napísať e-mail rozhodcom</PageTitle>
          <EmailComposer referees={referees} />
        </main>
      </div>
    </div>
  );
}
