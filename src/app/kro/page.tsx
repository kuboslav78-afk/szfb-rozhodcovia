import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { PageTitle } from "@/components/PageTitle";
import { LicenseBadge } from "@/components/LicenseBadge";
import { getPendingNominationCount } from "@/lib/nominations";
import { getEffectiveIsAdmin } from "@/lib/view-mode";
import type { LicenseLevel } from "@/lib/licenses";

const PREDSEDA = "Jakub Kučera";
const CLENOVIA = ["Peter Vrba", "Peter Zámečnik", "Tomáš Juhás", "Roman Sklenica", "Tomáš Beňo"];

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export default async function KroPage() {
  const referee = await requireUser();
  if (referee.role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();
  const isSuperAdmin = await getEffectiveIsAdmin(referee.role);
  const pendingNominations = await getPendingNominationCount(supabase, referee.id);

  const allNames = [PREDSEDA, ...CLENOVIA];
  const { data: refRows } = await supabase
    .from("referees")
    .select("full_name, license_level, home_region")
    .in("full_name", allNames);

  const byName = new Map(
    (refRows ?? []).map((r) => [
      normalize(r.full_name),
      { license: r.license_level as LicenseLevel | null, homeRegion: r.home_region as string | null },
    ]),
  );

  function memberInfo(name: string) {
    return byName.get(normalize(name)) ?? null;
  }

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
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
          <PageTitle className="mb-1">KRO</PageTitle>
          <p className="mb-8 text-sm text-zinc-400">
            Komisia rozhodcov a observerov SZFB — interná sekcia pre členov komisie.
          </p>

          <div className="mb-6 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
            <div className="mb-4 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
              Zloženie komisie
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-900">
                <span className="flex items-center text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  {PREDSEDA}
                  <LicenseBadge level={memberInfo(PREDSEDA)?.license} />
                </span>
                <span className="text-xs font-semibold tracking-wide text-brand-indigo uppercase">Predseda</span>
              </div>
              {CLENOVIA.map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between px-3 py-2.5 border-b border-zinc-100 last:border-b-0 dark:border-zinc-900"
                >
                  <span className="flex items-center text-sm text-zinc-700 dark:text-zinc-200">
                    {name}
                    <LicenseBadge level={memberInfo(name)?.license} />
                  </span>
                  <span className="text-xs text-zinc-400">Člen komisie</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-zinc-200 p-6 dark:border-zinc-800">
            <div className="mb-2 font-semibold text-zinc-800 dark:text-zinc-100">Zasadnutia KRO</div>
            <p className="text-sm text-zinc-400">
              Plánovanie zasadnutí a úlohy pre členov komisie sa pripravujú.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
