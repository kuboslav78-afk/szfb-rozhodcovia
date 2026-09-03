import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { PageTitle } from "@/components/PageTitle";
import { HomeRegionPrompt } from "@/components/HomeRegionPrompt";
import { getPendingNominationCount } from "@/lib/nominations";
import { getEffectiveIsAdmin } from "@/lib/view-mode";
import { LICENSE_LABELS, isLicenseLevel } from "@/lib/licenses";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import { todayDateStr } from "@/lib/dates";
import type { Category } from "@/lib/categories";

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("sk-SK", { day: "numeric", month: "2-digit" });
}

export default async function HomePage() {
  const referee = await requireUser();
  const supabase = await createClient();
  const realIsAdmin = referee.role === "admin";
  const isSuperAdmin = await getEffectiveIsAdmin(referee.role);
  const isViewer = referee.role === "viewer";
  const today = todayDateStr();

  const pendingNominations = await getPendingNominationCount(supabase, referee.id);

  // Regionálny admin (category_admins) dostane rovnaký nominačný prehľad ako super
  // admin, len zúžený na kategórie, ktoré spravuje. Keď je super admin prepnutý do
  // "náhľadu rozhodcu", do tejto vetvy vôbec nespadne — vidí rozhodcovský dashboard.
  let myAdminCategories: Category[] = [];
  if (!realIsAdmin && !isViewer) {
    const { data } = await supabase
      .from("category_admins")
      .select("category")
      .eq("referee_id", referee.id);
    myAdminCategories = (data ?? []).map((r) => r.category as Category);
  }

  const isRegionalAdmin = myAdminCategories.length > 0;

  if (isSuperAdmin || isRegionalAdmin) {
    const adminCategories: Category[] = isSuperAdmin ? [...CATEGORIES] : myAdminCategories;

    const [{ data: needsNominationRows }, { count: needsNominationCount }, { count: awaitingResponseCount }] =
      await Promise.all([
        supabase
          .from("matches")
          .select("id, category, league, team_home, team_away, match_date, match_time")
          .in("category", adminCategories)
          .or("referee1_id.is.null,referee2_id.is.null")
          .gte("match_date", today)
          .order("match_date")
          .order("match_time")
          .limit(5),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .in("category", adminCategories)
          .or("referee1_id.is.null,referee2_id.is.null")
          .gte("match_date", today),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .in("category", adminCategories)
          .or("referee1_status.eq.sent,referee2_status.eq.sent")
          .gte("match_date", today),
      ]);

    return (
      <div className="lg:flex">
        <Sidebar
          current="prehlad"
          refereeName={referee.full_name}
          roleLabel={
            isSuperAdmin
              ? "Administrátor"
              : `Regionálny admin · ${adminCategories.map((c) => CATEGORY_LABELS[c]).join(", ")}`
          }
          isAdmin={isSuperAdmin}
          pendingNominations={pendingNominations}
          canToggleView={realIsAdmin}
          viewMode="admin"
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
            <PageTitle className={isSuperAdmin ? "mb-8" : "mb-1"}>Prehľad</PageTitle>
            {!isSuperAdmin && (
              <p className="mb-8 text-sm text-zinc-400">
                Zobrazené sú len zápasy kategórií, ktoré spravuješ —{" "}
                {adminCategories.map((c) => CATEGORY_LABELS[c]).join(", ")}.
              </p>
            )}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
              {/* LEFT COLUMN */}
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="font-semibold text-zinc-800 dark:text-zinc-100">Zápasy na nomináciu</div>
                    <a href="/nominations" className="text-sm text-brand-indigo hover:underline">
                      Zobraziť všetky →
                    </a>
                  </div>

                  {(needsNominationRows ?? []).length === 0 ? (
                    <p className="py-6 text-center text-sm text-zinc-400">
                      Všetky nadchádzajúce zápasy majú obsadených oboch rozhodcov.
                    </p>
                  ) : (
                    <div className="flex flex-col gap-px bg-zinc-100 dark:bg-zinc-900">
                      {(needsNominationRows ?? []).map((m) => (
                        <a
                          key={m.id}
                          href={`/nominations?category=${m.category}`}
                          className="flex items-center gap-5 bg-white px-1 py-4 transition hover:bg-zinc-50 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                        >
                          <div className="w-14 shrink-0 text-center">
                            <div className="font-headline text-lg text-zinc-800 dark:text-zinc-100">
                              {formatDateLabel(m.match_date)}
                            </div>
                            {m.match_time && (
                              <div className="text-[11px] text-zinc-400">{m.match_time.slice(0, 5)}</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                              {m.team_home} – {m.team_away}
                            </div>
                            <div className="truncate text-xs text-zinc-400">
                              {m.league} · {CATEGORY_LABELS[m.category as Category]}
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700 uppercase dark:bg-red-950 dark:text-red-300">
                            Chýba rozhodca
                          </span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {isSuperAdmin && (
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-zinc-200 p-6 dark:border-zinc-800">
                    <div>
                      <div className="font-semibold text-zinc-800 dark:text-zinc-100">Úlohy pre členov KRO</div>
                      <div className="mt-1 text-sm text-zinc-400">Modul úloh sa pripravuje.</div>
                    </div>
                    <a
                      href="/kro"
                      className="shrink-0 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                    >
                      Zobraziť KRO
                    </a>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN */}
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
                  <div className="mb-4 text-xs font-semibold tracking-wide text-zinc-400 uppercase">Nominácie</div>
                  <div className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-zinc-500">Bez rozhodcu</span>
                      <span className="font-headline text-xl text-red-600 dark:text-red-400">
                        {needsNominationCount ?? 0}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm text-zinc-500">Čaká na potvrdenie</span>
                      <span className="font-headline text-xl text-amber-600 dark:text-amber-400">
                        {awaitingResponseCount ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-zinc-200 p-5 dark:border-zinc-800">
                  <div className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                    Novinky KRO
                  </div>
                  <p className="text-sm text-zinc-400">Modul noviniek sa pripravuje.</p>
                </div>

                <div className="rounded-xl border border-dashed border-zinc-200 p-5 dark:border-zinc-800">
                  <div className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase">Odmeny</div>
                  <p className="text-sm text-zinc-400">Modul vyúčtovania sa pripravuje.</p>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const [{ data: refereeRow }, { data: upcomingRows }, { data: confirmedPastRows }, { data: myCategoryRows }] =
    await Promise.all([
      supabase.from("referees").select("license_level").eq("id", referee.id).maybeSingle(),
      supabase
        .from("matches")
        .select(
          "id, league, team_home, team_away, match_date, match_time, venue, referee1_id, referee1_status, referee2_id, referee2_status",
        )
        .or(
          `and(referee1_id.eq.${referee.id},referee1_status.neq.draft),and(referee2_id.eq.${referee.id},referee2_status.neq.draft)`,
        )
        .gte("match_date", today)
        .order("match_date")
        .order("match_time")
        .limit(3),
      supabase
        .from("matches")
        .select("id")
        .or(
          `and(referee1_id.eq.${referee.id},referee1_status.eq.confirmed),and(referee2_id.eq.${referee.id},referee2_status.eq.confirmed)`,
        )
        .lt("match_date", today),
      supabase.from("referee_categories").select("category").eq("referee_id", referee.id),
    ]);

  const myCategories = (myCategoryRows ?? []).map((r) => r.category as Category);
  const needsHomeRegionPrompt = !isViewer && !referee.home_region && myCategories.length === 0;

  const licenseLevel = refereeRow?.license_level;
  const licenseLabel = licenseLevel && isLicenseLevel(licenseLevel) ? LICENSE_LABELS[licenseLevel] : null;

  const upcoming = (upcomingRows ?? []).map((m) => {
    const isSlot1 = m.referee1_id === referee.id;
    const status = isSlot1 ? m.referee1_status : m.referee2_status;
    return {
      id: m.id,
      league: m.league,
      teamHome: m.team_home,
      teamAway: m.team_away,
      matchDate: m.match_date,
      matchTime: m.match_time,
      venue: m.venue,
      status,
    };
  });

  const officiatedCount = confirmedPastRows?.length ?? 0;

  return (
    <div className="lg:flex">
      {needsHomeRegionPrompt && <HomeRegionPrompt />}
      <Sidebar
        current="prehlad"
        refereeName={referee.full_name}
        roleLabel={realIsAdmin ? "Administrátor · náhľad rozhodcu" : referee.role === "viewer" ? "Viewer" : null}
        isAdmin={isSuperAdmin}
        canSeeKro={referee.role === "viewer"}
        pendingNominations={pendingNominations}
        canToggleView={realIsAdmin}
        viewMode="referee"
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
          <PageTitle className="mb-8">Prehľad</PageTitle>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
            {/* LEFT COLUMN */}
            <div className="flex flex-col gap-6">
              {/* LICENCE CARD */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
                <div className="flex items-center gap-5">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-900">
                    <span className="font-headline text-2xl text-brand-indigo">{licenseLevel ?? "—"}</span>
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-800 dark:text-zinc-100">
                      {licenseLabel ? `Licencia ${licenseLevel} · ${licenseLabel}` : "Licencia zatiaľ nepridelená"}
                    </div>
                    <div className="mt-1 text-sm text-zinc-400">
                      Región: {referee.home_region ?? "—"}
                    </div>
                  </div>
                </div>
                <a
                  href="/profil"
                  className="shrink-0 rounded-lg bg-brand-indigo px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark"
                >
                  Zobraziť profil
                </a>
              </div>

              {/* UPCOMING NOMINATIONS */}
              <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
                <div className="mb-4 flex items-center justify-between">
                  <div className="font-semibold text-zinc-800 dark:text-zinc-100">Najbližšie nominácie</div>
                  <a href="/nominations" className="text-sm text-brand-indigo hover:underline">
                    Zobraziť všetky →
                  </a>
                </div>

                {upcoming.length === 0 ? (
                  <p className="py-6 text-center text-sm text-zinc-400">
                    Zatiaľ nemáš žiadne odoslané nominácie.
                  </p>
                ) : (
                  <div className="flex flex-col gap-px bg-zinc-100 dark:bg-zinc-900">
                    {upcoming.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center gap-5 bg-white px-1 py-4 dark:bg-zinc-950"
                      >
                        <div className="w-14 shrink-0 text-center">
                          <div className="font-headline text-lg text-zinc-800 dark:text-zinc-100">
                            {formatDateLabel(m.matchDate)}
                          </div>
                          {m.matchTime && <div className="text-[11px] text-zinc-400">{m.matchTime.slice(0, 5)}</div>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                            {m.teamHome} – {m.teamAway}
                          </div>
                          <div className="truncate text-xs text-zinc-400">
                            {m.league} · {m.venue ?? "miesto zatiaľ neurčené"}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase ${
                            m.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          }`}
                        >
                          {m.status === "confirmed" ? "Potvrdené" : "Čaká na teba"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* VZDELAVANIE PLACEHOLDER */}
              <div className="flex items-center justify-between gap-4 rounded-xl border border-dashed border-zinc-200 p-6 dark:border-zinc-800">
                <div>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-100">Vzdelávanie a e-learning</div>
                  <div className="mt-1 text-sm text-zinc-400">Modul sa pripravuje.</div>
                </div>
                <a
                  href="/vzdelavanie"
                  className="shrink-0 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
                >
                  Zobraziť
                </a>
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="flex flex-col gap-6">
              <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
                <div className="mb-4 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  Táto sezóna
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-zinc-500">Odpískané zápasy</span>
                    <span className="font-headline text-xl text-zinc-800 dark:text-zinc-100">{officiatedCount}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm text-zinc-500">Priemerné hodnotenie</span>
                    <span className="text-sm text-zinc-300 italic dark:text-zinc-600">čoskoro</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-zinc-200 p-5 dark:border-zinc-800">
                <div className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
                  Novinky KRO
                </div>
                <p className="text-sm text-zinc-400">Modul noviniek sa pripravuje.</p>
              </div>

              <div className="rounded-xl border border-dashed border-zinc-200 p-5 dark:border-zinc-800">
                <div className="mb-3 text-xs font-semibold tracking-wide text-zinc-400 uppercase">Odmeny</div>
                <p className="text-sm text-zinc-400">Modul vyúčtovania sa pripravuje.</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
