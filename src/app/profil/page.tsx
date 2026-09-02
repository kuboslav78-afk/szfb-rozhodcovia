import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { PageTitle } from "@/components/PageTitle";
import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { getPendingNominationCount } from "@/lib/nominations";

export default async function ProfilPage() {
  const referee = await requireUser();
  const supabase = await createClient();
  const isSuperAdmin = referee.role === "admin";
  const pendingNominations = await getPendingNominationCount(supabase, referee.id);

  return (
    <div className="lg:flex">
      <Sidebar
        current={null}
        refereeName={referee.full_name}
        roleLabel={isSuperAdmin ? "Administrátor" : referee.role === "viewer" ? "Viewer" : null}
        isAdmin={isSuperAdmin}
        pendingNominations={pendingNominations}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10">
          <Link
            href="/dostupnost"
            className="mb-6 inline-block text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            ← Späť na kalendár
          </Link>

          <PageTitle className="mb-6">Môj profil</PageTitle>

          <div className="mb-6 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">Meno</dt>
                <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                  {referee.full_name}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-zinc-500">E-mail</dt>
                <dd className="font-medium text-zinc-800 dark:text-zinc-200">
                  {referee.email}
                </dd>
              </div>
            </dl>
          </div>

          <ChangePasswordForm />
        </main>
      </div>
    </div>
  );
}
