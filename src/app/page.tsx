import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/Sidebar";
import { PageTitle } from "@/components/PageTitle";
import { HomeRegionPrompt } from "@/components/HomeRegionPrompt";
import { ProfileCompletionPrompt } from "@/components/ProfileCompletionPrompt";
import { WeeklyTestPrompt } from "@/components/WeeklyTestPrompt";
import { isTestingEnabled } from "@/lib/settings";
import { missingProfileFields } from "@/lib/profile-completeness";
import { getPendingNominationCount } from "@/lib/nominations";
import { getOverallEarnings, getRefereeEarnings } from "@/lib/earnings";
import { EarningsCard, OverallEarningsCard } from "@/components/EarningsCard";
import { getEffectiveIsAdmin, isRefereeViewActive } from "@/lib/view-mode";
import { LICENSE_LABELS, isLicenseLevel } from "@/lib/licenses";
import { DashboardCategoryTabs } from "@/components/DashboardCategoryTabs";
import { CATEGORY_LABELS, isCategory } from "@/lib/categories";
import { getCategoryAccess } from "@/lib/category-access";
import {
  formatWindowLabel,
  todayDateStr,
  twoWeekWindow,
  weekMondayIso,
} from "@/lib/dates";
import type { Category } from "@/lib/categories";

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("sk-SK", { day: "numeric", month: "2-digit" });
}

export default async function HomePage(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const referee = await requireUser();
  const supabase = await createClient();
  const testingEnabled = await isTestingEnabled(supabase);
  const realIsAdmin = referee.role === "admin";
  const isSuperAdmin = await getEffectiveIsAdmin(referee.role);
  const isViewer = referee.role === "viewer";
  const today = todayDateStr();

  const pendingNominations = await getPendingNominationCount(supabase, referee.id);

  // Kategóriový prístup (category_admins) dáva rovnaký nominačný prehľad ako má
  // super admin, len zúžený na kategórie používateľa — a to aj pri nahliadacom
  // prístupe, keďže dashboard nič neupravuje. Kto si prepol "náhľad rozhodcu",
  // dostane rozhodcovský dashboard bez ohľadu na svoje práva.
  const refereeView = await isRefereeViewActive();
  const categoryAccess = isViewer
    ? { visible: [], editable: [] }
    : await getCategoryAccess(supabase, referee.id, realIsAdmin);

  const hasAdminAccess = categoryAccess.visible.length > 0;

  // Prepínač na rozhodcu má zmysel len pre toho, kto naozaj píska — člen KRO,
  // ktorý rozhodcom nie je, by sa prepol do prázdnej stránky. Super admin si ho
  // ponecháva vždy (potrebuje vedieť skontrolovať, ako appka vyzerá rozhodcovi).
  const { count: myCategoryCount } = await supabase
    .from("referee_categories")
    .select("category", { count: "exact", head: true })
    .eq("referee_id", referee.id);

  const isActiveReferee = (myCategoryCount ?? 0) > 0 || referee.home_region !== null;
  const canToggleView = realIsAdmin || (hasAdminAccess && isActiveReferee);

  if (hasAdminAccess && !refereeView) {
    const adminCategories = categoryAccess.visible;

    // Prepínač kategórií — ponúka len tie, ku ktorým má admin prístup.
    // Bez parametra (alebo pri nepovolenej hodnote) sa zobrazujú všetky jeho naraz.
    const categoryParam = singleParam(searchParams.category);
    const selectedCategory: Category | null =
      categoryParam && isCategory(categoryParam) && adminCategories.includes(categoryParam)
        ? categoryParam
        : null;
    const queryCategories = selectedCategory ? [selectedCategory] : adminCategories;

    // Nominačný prehľad drží pevné dvojtýždňové okno ukotvené na pondelok,
    // takže sa počas týždňa nemení a preklopí sa vždy v pondelok.
    const nominationWindow = twoWeekWindow();
    const overallEarnings = await getOverallEarnings(supabase);

    const [{ data: needsNominationRows }, { count: needsNominationCount }, { count: awaitingResponseCount }] =
      await Promise.all([
        supabase
          .from("matches")
          .select("id, category, league, team_home, team_away, match_date, match_time")
          .in("category", queryCategories)
          .or("referee1_id.is.null,referee2_id.is.null")
          .gte("match_date", nominationWindow.from)
          .lte("match_date", nominationWindow.to)
          .order("match_date")
          .order("match_time")
          .limit(10),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .in("category", queryCategories)
          .or("referee1_id.is.null,referee2_id.is.null")
          .gte("match_date", nominationWindow.from)
          .lte("match_date", nominationWindow.to),
        supabase
          .from("matches")
          .select("id", { count: "exact", head: true })
          .in("category", queryCategories)
          .or("referee1_status.eq.sent,referee2_status.eq.sent")
          .gte("match_date", nominationWindow.from)
          .lte("match_date", nominationWindow.to),
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
          canToggleView={canToggleView}
          viewMode="admin"
        testingEnabled={testingEnabled}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
            <PageTitle className="mb-1">Prehľad</PageTitle>
            <p className="mb-6 text-sm text-zinc-400">
              Nominačný prehľad na najbližšie 2 týždne ({formatWindowLabel(nominationWindow)}) — okno sa
              posúva vždy v pondelok.
              {!isSuperAdmin &&
                ` Spravuješ: ${adminCategories.map((c) => CATEGORY_LABELS[c]).join(", ")}.`}
            </p>

            <DashboardCategoryTabs categories={adminCategories} active={selectedCategory} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr] lg:items-start">
              {/* LEFT COLUMN */}
              <div className="flex flex-col gap-6">
                <div className="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-zinc-800 dark:text-zinc-100">Zápasy na nomináciu</div>
                      <div className="mt-0.5 text-xs text-zinc-400">{formatWindowLabel(nominationWindow)}</div>
                    </div>
                    <a
                      href={selectedCategory ? `/nominations?category=${selectedCategory}` : "/nominations"}
                      className="text-sm text-brand-indigo hover:underline"
                    >
                      Zobraziť všetky →
                    </a>
                  </div>

                  {(needsNominationRows ?? []).length === 0 ? (
                    <p className="py-6 text-center text-sm text-zinc-400">
                      V najbližších 2 týždňoch majú všetky zápasy obsadených oboch rozhodcov.
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
                  <div className="mb-1 text-xs font-semibold tracking-wide text-zinc-400 uppercase">Nominácie</div>
                  <div className="mb-4 text-xs text-zinc-400">Najbližšie 2 týždne</div>
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

                <OverallEarningsCard earnings={overallEarnings} />
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const [{ data: refereeRow }, { data: upcomingRows }, { data: confirmedPastRows }, { data: myCategoryRows }] =
    await Promise.all([
      supabase
        .from("referees")
        .select(
          "license_level, phone, address, date_of_birth, birth_number, bank_account, jersey_size, shorts_size, socks_size, criminal_record_uploaded_at",
        )
        .eq("id", referee.id)
        .maybeSingle(),
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
  // Člen KRO s administratívnym prístupom nemusí byť aktívny rozhodca — nenúť ho
  // vyberať si domáci región len preto, že si prepol do náhľadu rozhodcu.
  const needsHomeRegionPrompt =
    !isViewer && !hasAdminAccess && !referee.home_region && myCategories.length === 0;

  const licenseLevel = refereeRow?.license_level;
  const licenseLabel = licenseLevel && isLicenseLevel(licenseLevel) ? LICENSE_LABELS[licenseLevel] : null;

  // Viewer si profil nevypĺňa (RLS mu zápis aj tak neumožní), takže ho nenaháňame.
  const missingFields = isViewer ? [] : missingProfileFields(refereeRow ?? {});
  const missingCriminalRecord = !isViewer && !refereeRow?.criminal_record_uploaded_at;

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
  const myEarnings = isViewer ? null : await getRefereeEarnings(supabase, referee.id);

  // Pripomienka týždenného testu — kým ho rozhodca neodošle. Zadanie vzniká až
  // pri prvom otvorení testu, takže jeho absencia znamená, že ešte nezačal.
  let weeklyTest = { pending: false, started: false };

  if (testingEnabled && !isViewer) {
    const { data: assignment } = await supabase
      .from("test_assignments")
      .select("submitted_at")
      .eq("referee_id", referee.id)
      .eq("week_start", weekMondayIso())
      .maybeSingle();

    weeklyTest = {
      pending: !assignment?.submitted_at,
      started: Boolean(assignment),
    };
  }

  return (
    <div className="lg:flex">
      {needsHomeRegionPrompt && <HomeRegionPrompt />}
      <Sidebar
        current="prehlad"
        refereeName={referee.full_name}
        roleLabel={
          realIsAdmin
            ? "Administrátor · náhľad rozhodcu"
            : referee.role === "viewer"
              ? "Viewer"
              : hasAdminAccess
                ? "Náhľad rozhodcu"
                : null
        }
        isAdmin={isSuperAdmin}
        canSeeKro={referee.role === "viewer"}
        pendingNominations={pendingNominations}
        canToggleView={canToggleView}
        viewMode="referee"
        testingEnabled={testingEnabled}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
          <PageTitle className="mb-8">Prehľad</PageTitle>

          <ProfileCompletionPrompt
            missingFields={missingFields}
            missingCriminalRecord={missingCriminalRecord}
          />

          {weeklyTest.pending && <WeeklyTestPrompt started={weeklyTest.started} />}

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

              {myEarnings && <EarningsCard earnings={myEarnings} />}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
