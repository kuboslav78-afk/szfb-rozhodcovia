import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import {
  monthGrid,
  monthLabel,
  monthParam,
  parseMonthParam,
  todayDateStr,
  toDateStr,
} from "@/lib/dates";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  parseCategoryParam,
  type Category,
} from "@/lib/categories";
import type { LicenseLevel } from "@/lib/licenses";
import { HomeRegionPrompt } from "@/components/HomeRegionPrompt";
import { MonthNav } from "@/components/MonthNav";
import { RefereeCalendar } from "@/components/RefereeCalendar";
import { AdminOverview } from "@/components/AdminOverview";
import { MatchDaysEditor } from "@/components/MatchDaysEditor";
import { Sidebar } from "@/components/Sidebar";
import { PageTitle } from "@/components/PageTitle";
import { CategoryTabs } from "@/components/CategoryTabs";
import { RegionSwitcher } from "@/components/RegionSwitcher";
import { UnfilledReminder } from "@/components/UnfilledReminder";
import { RefereeCategoriesManager } from "@/components/RefereeCategoriesManager";
import { CategoryAdminsManager } from "@/components/CategoryAdminsManager";
import { RefereeDataTable, type RefereeDataRow } from "@/components/RefereeDataTable";
import { AddRefereeForm } from "@/components/AddRefereeForm";
import { ImportRefereesForm } from "@/components/ImportRefereesForm";
import {
  CancellationRequests,
  type CancellationRequestItem,
} from "@/components/CancellationRequests";
import { getPendingNominationCount } from "@/lib/nominations";
import { getEffectiveIsAdmin, isRefereeViewActive } from "@/lib/view-mode";
import { getCategoryAccess } from "@/lib/category-access";
import type { CategoryAccessLevel } from "@/app/admin-users/actions";
import type { AvailabilityStatus } from "@/app/availability/actions";

type DayEntry = {
  status: AvailabilityStatus;
  reason: string | null;
  availableFrom: string | null;
  availableTo: string | null;
  cancelRequested: boolean;
};

function singleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DostupnostPage(props: PageProps<"/dostupnost">) {
  const searchParams = await props.searchParams;
  const monthKey = parseMonthParam(singleParam(searchParams.month));
  const viewParamRaw = singleParam(searchParams.view);
  const categoryParamRaw = singleParam(searchParams.category);

  const referee = await requireUser();
  const supabase = await createClient();

  const realIsAdmin = referee.role === "admin";
  const isSuperAdmin = await getEffectiveIsAdmin(referee.role);
  const isViewer = referee.role === "viewer";
  const canSeeAllCategories = isSuperAdmin || isViewer;
  const refereeView = await isRefereeViewActive();

  const [{ data: myCategoryRows }, categoryAccess] = await Promise.all([
    supabase.from("referee_categories").select("category").eq("referee_id", referee.id),
    getCategoryAccess(supabase, referee.id, realIsAdmin),
  ]);

  const myCategories = (myCategoryRows ?? []).map((r) => r.category as Category);

  // Prepínač Admin/Rozhodca patrí každému s administratívnym prístupom — vrátane
  // člena KRO, ktorý má kategórie len na nahliadnutie a zároveň sám píska.
  const hasAdminAccess = !isViewer && categoryAccess.visible.length > 0;

  // Prepínač na rozhodcu len pre toho, kto naozaj píska (viď dashboard).
  const isActiveReferee = myCategories.length > 0 || referee.home_region !== null;
  const canToggleView = realIsAdmin || (hasAdminAccess && isActiveReferee);

  // V "náhľade rozhodcu" sa administratívna časť skryje celá.
  const myAdminCategories: Category[] = isViewer
    ? [...CATEGORIES]
    : refereeView
      ? []
      : categoryAccess.visible;
  const myEditableCategories: Category[] =
    isViewer || refereeView ? [] : categoryAccess.editable;

  const canSeeAdmin = myAdminCategories.length > 0;
  const view: "prehlad" | "moje" | "admin" =
    isSuperAdmin && viewParamRaw === "admin"
      ? "admin"
      : canSeeAdmin && !isViewer && viewParamRaw === "moje"
        ? "moje"
        : "prehlad";
  const adminView = canSeeAdmin && view === "prehlad";
  const isAdminSection = isSuperAdmin && view === "admin";

  const visibleCategories: Category[] = adminView ? myAdminCategories : myCategories;

  const primaryCategory: Category = myCategories.includes("celostatny")
    ? "celostatny"
    : (referee.home_region ?? myCategories[0] ?? "celostatny");

  const requestedCategory = parseCategoryParam(categoryParamRaw);
  const category: Category = adminView
    ? visibleCategories.includes(requestedCategory)
      ? requestedCategory
      : (visibleCategories[0] ?? "celostatny")
    : myCategories.includes(requestedCategory)
      ? requestedCategory
      : primaryCategory;

  const canEditCurrentCategory = myEditableCategories.includes(category);

  const days = monthGrid(monthKey).filter((d): d is number => d !== null);
  const firstDay = toDateStr(monthKey.year, monthKey.month, days[0]);
  const lastDay = toDateStr(monthKey.year, monthKey.month, days[days.length - 1]);

  const { data: matchDayRows } = await supabase
    .from("match_days")
    .select("match_date, leagues")
    .eq("category", category)
    .gte("match_date", firstDay)
    .lte("match_date", lastDay);

  const matchDays = (matchDayRows ?? []).map((row) => row.match_date as string);
  const matchDayLeagues: Record<string, string[]> = Object.fromEntries(
    (matchDayRows ?? []).map((row) => [
      row.match_date as string,
      (row.leagues as string[] | null) ?? [],
    ]),
  );

  let refereeAvailability: Record<string, DayEntry> = {};
  type RefereeRow = {
    id: string;
    full_name: string;
    license_level: LicenseLevel | null;
    home_region: Category | null;
    role: "admin" | "referee" | "viewer";
  };
  let adminReferees: RefereeRow[] = [];
  let adminCelostatnySet = new Set<string>();
  let adminAvailability: Record<string, Record<string, DayEntry>> = {};
  let cancellationRequests: CancellationRequestItem[] = [];
  let allReferees: RefereeRow[] = [];
  let allRefereeCategories: Record<string, Category[]> = {};
  let refereeData: RefereeDataRow[] = [];
  let allCategoryAccess: Record<string, Partial<Record<Category, CategoryAccessLevel>>> = {};

  if (canSeeAllCategories && (adminView || isAdminSection)) {
    const [{ data: allRefs }, { data: allCatRows }, { data: allAdminRows }] =
      await Promise.all([
        supabase
          .from("referees")
          .select("id, full_name, license_level, home_region, role")
          .eq("active", true)
          .order("full_name"),
        supabase.from("referee_categories").select("referee_id, category"),
        supabase.from("category_admins").select("referee_id, category, can_edit"),
      ]);

    allReferees = allRefs ?? [];

    allRefereeCategories = {};
    for (const row of allCatRows ?? []) {
      const id = row.referee_id as string;
      allRefereeCategories[id] ??= [];
      allRefereeCategories[id].push(row.category as Category);
    }

    allCategoryAccess = {};
    for (const row of allAdminRows ?? []) {
      const id = row.referee_id as string;
      allCategoryAccess[id] ??= {};
      allCategoryAccess[id][row.category as Category] = row.can_edit ? "edit" : "view";
    }
  }

  // Profilové údaje ťaháme len v Administrácii — v kalendárovom prehľade sú zbytočné.
  if (isAdminSection) {
    const { data } = await supabase
      .from("referees")
      .select(
        "id, full_name, email, phone, address, date_of_birth, birth_number, bank_account, jersey_size, shorts_size, socks_size, license_level, home_region, photo_path, criminal_record_uploaded_at",
      )
      .eq("active", true)
      .order("full_name");
    refereeData = (data ?? []) as RefereeDataRow[];
  }

  if (adminView) {
    const availabilityQueries = [
      supabase
        .from("availability")
        .select(
          "referee_id, available_date, status, reason, available_from, available_to, cancel_requested",
        )
        .eq("category", category)
        .gte("available_date", firstDay)
        .lte("available_date", lastDay),
      supabase
        .from("availability")
        .select(
          "referee_id, available_date, status, reason, available_from, available_to, referees(full_name)",
        )
        .eq("category", category)
        .eq("cancel_requested", true)
        .order("cancel_requested_at"),
    ] as const;

    // "celoštátny" je trvalé, adminom udelené členstvo — zobrazuje sa vždy.
    // Pre regióny sa natrvalo zobrazujú len domáci (podľa home_region); ostatní
    // (napr. celoštátny rozhodca, ktorý si "ponúkol termín") sa zobrazia len
    // v mesiacoch, kde si tam skutočne niečo vyplnili — nabudúce bez vyplnenia
    // im tam meno už nesvieti.
    const baseRefereeIdsQuery =
      category === "celostatny"
        ? supabase.from("referee_categories").select("referee_id").eq("category", category)
        : supabase.from("referees").select("id").eq("home_region", category).eq("active", true);

    const [{ data: baseRows }, { data: rows }, { data: pending }] = await Promise.all([
      baseRefereeIdsQuery,
      ...availabilityQueries,
    ]);

    const baseRefereeIds: string[] = (baseRows ?? []).map((r) =>
      ("referee_id" in r ? r.referee_id : r.id) as string,
    );
    const filledRefereeIds = (rows ?? []).map((r) => r.referee_id as string);

    const categoryRefereeIds = new Set([...baseRefereeIds, ...filledRefereeIds]);

    if (canSeeAllCategories) {
      adminReferees = allReferees.filter((r) => categoryRefereeIds.has(r.id));
    } else if (categoryRefereeIds.size > 0) {
      const { data: catReferees } = await supabase
        .from("referees")
        .select("id, full_name, license_level, home_region, role")
        .in("id", Array.from(categoryRefereeIds))
        .eq("active", true)
        .order("full_name");
      adminReferees = catReferees ?? [];
    }

    if (adminReferees.length > 0) {
      const { data: celostatnyRows } = await supabase
        .from("referee_categories")
        .select("referee_id")
        .eq("category", "celostatny")
        .in(
          "referee_id",
          adminReferees.map((r) => r.id),
        );
      adminCelostatnySet = new Set(
        (celostatnyRows ?? []).map((r) => r.referee_id as string),
      );
    }

    adminAvailability = {};
    for (const row of rows ?? []) {
      adminAvailability[row.referee_id] ??= {};
      adminAvailability[row.referee_id][row.available_date] = {
        status: row.status as AvailabilityStatus,
        reason: row.reason as string | null,
        availableFrom: row.available_from as string | null,
        availableTo: row.available_to as string | null,
        cancelRequested: row.cancel_requested as boolean,
      };
    }

    cancellationRequests = (pending ?? []).map((row) => {
      const refereeRelation = row.referees as
        | { full_name: string }
        | { full_name: string }[]
        | null;
      const refereeName = Array.isArray(refereeRelation)
        ? (refereeRelation[0]?.full_name ?? "?")
        : (refereeRelation?.full_name ?? "?");

      return {
        refereeId: row.referee_id as string,
        refereeName,
        date: row.available_date as string,
        category,
        status: row.status as string,
        reason: row.reason as string | null,
        availableFrom: row.available_from as string | null,
        availableTo: row.available_to as string | null,
      };
    });
  } else if (myCategories.length > 0) {
    const { data: rows } = await supabase
      .from("availability")
      .select(
        "available_date, status, reason, available_from, available_to, cancel_requested",
      )
      .eq("referee_id", referee.id)
      .eq("category", category)
      .gte("available_date", firstDay)
      .lte("available_date", lastDay);

    refereeAvailability = Object.fromEntries(
      (rows ?? []).map((row) => [
        row.available_date,
        {
          status: row.status as AvailabilityStatus,
          reason: row.reason as string | null,
          availableFrom: row.available_from as string | null,
          availableTo: row.available_to as string | null,
          cancelRequested: row.cancel_requested as boolean,
        },
      ]),
    );
  }

  let unfilledThisMonth: string[] = [];
  let nextUnfilledMonth: { monthParam: string; label: string } | null = null;

  if (!adminView && !isAdminSection && myCategories.includes(category)) {
    unfilledThisMonth = matchDays.filter((d) => !refereeAvailability[d]);

    const { data: futureMatchDayRows } = await supabase
      .from("match_days")
      .select("match_date")
      .eq("category", category)
      .gt("match_date", lastDay)
      .order("match_date")
      .limit(120);

    const futureDates = (futureMatchDayRows ?? []).map(
      (row) => row.match_date as string,
    );

    if (futureDates.length > 0) {
      const { data: futureFilledRows } = await supabase
        .from("availability")
        .select("available_date")
        .eq("referee_id", referee.id)
        .eq("category", category)
        .in("available_date", futureDates);

      const futureFilledSet = new Set(
        (futureFilledRows ?? []).map((row) => row.available_date as string),
      );
      const firstUnfilled = futureDates.find((d) => !futureFilledSet.has(d));

      if (firstUnfilled) {
        const [year, month] = firstUnfilled.split("-").map(Number);
        nextUnfilledMonth = {
          monthParam: monthParam({ year, month }),
          label: monthLabel({ year, month }),
        };
      }
    }
  }

  // Člen KRO s administratívnym prístupom nemusí byť aktívny rozhodca — nenúť ho
  // vyberať si domáci región len preto, že si prepol do náhľadu rozhodcu.
  const needsHomeRegionPrompt =
    !isViewer && !hasAdminAccess && !referee.home_region && myCategories.length === 0;

  const pendingNominations = await getPendingNominationCount(supabase, referee.id);

  return (
    <div className="lg:flex">
      <Sidebar
        current={isAdminSection ? "administracia" : "dostupnost"}
        refereeName={referee.full_name}
        roleLabel={
          realIsAdmin
            ? isSuperAdmin
              ? "Administrátor"
              : "Administrátor · náhľad rozhodcu"
            : isViewer
              ? "Viewer"
              : hasAdminAccess
                ? refereeView
                  ? "Náhľad rozhodcu"
                  : `Prístup · ${categoryAccess.visible.map((c) => CATEGORY_LABELS[c]).join(", ")}`
                : null
        }
        isAdmin={isSuperAdmin}
        canSeeKro={isSuperAdmin || isViewer}
        pendingNominations={pendingNominations}
        canToggleView={canToggleView}
        viewMode={refereeView ? "referee" : hasAdminAccess ? "admin" : "referee"}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        {needsHomeRegionPrompt && <HomeRegionPrompt />}

        <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <PageTitle>
              {isAdminSection
                ? "Administrácia"
                : adminView
                  ? "Prehľad dostupnosti"
                  : "Moja dostupnosť"}
            </PageTitle>

            {isAdminSection ? (
              <a
                href={`/dostupnost?month=${monthParam(monthKey)}&category=${category}`}
                className="ml-2 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                ← Späť na kalendár
              </a>
            ) : (
              canSeeAdmin && (
                <div className="ml-2 flex flex-wrap rounded-lg border border-zinc-200 p-0.5 text-sm dark:border-zinc-800">
                  {canSeeAdmin && (
                    <a
                      href={`/dostupnost?month=${monthParam(monthKey)}&category=${category}`}
                      className={`rounded-md px-3 py-1 font-medium transition ${
                        view === "prehlad"
                          ? "bg-brand-indigo text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      Prehľad
                    </a>
                  )}
                  {!isViewer && (
                    <a
                      href={`/dostupnost?month=${monthParam(monthKey)}&view=moje`}
                      className={`rounded-md px-3 py-1 font-medium transition ${
                        view === "moje"
                          ? "bg-brand-indigo text-white"
                          : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                      }`}
                    >
                      Moja dostupnosť
                    </a>
                  )}
                </div>
              )
            )}
          </div>

          {!isAdminSection && (
            <MonthNav
              monthKey={monthKey}
              view={canSeeAdmin ? view : undefined}
              category={category}
            />
          )}
        </div>

        {adminView && (
          <CategoryTabs
            categories={visibleCategories}
            active={category}
            monthKey={monthKey}
            view={canSeeAdmin ? view : undefined}
          />
        )}

        {isAdminSection ? (
          <>
            <AddRefereeForm />
            <ImportRefereesForm />
            <RefereeCategoriesManager
              referees={allReferees}
              initialCategories={allRefereeCategories}
            />
            <RefereeDataTable referees={refereeData} categories={allRefereeCategories} />
            <CategoryAdminsManager
              referees={allReferees}
              initialAccess={allCategoryAccess}
            />
          </>
        ) : adminView ? (
          <>
            {canEditCurrentCategory && <CancellationRequests items={cancellationRequests} />}
            {canEditCurrentCategory && (
              <MatchDaysEditor
                key={`${monthParam(monthKey)}-${category}`}
                monthKey={monthKey}
                category={category}
                initialMatchDays={matchDays}
                initialLeagues={matchDayLeagues}
              />
            )}
            <AdminOverview
              monthKey={monthKey}
              category={category}
              referees={adminReferees.map((r) => ({
                ...r,
                is_celostatny: adminCelostatnySet.has(r.id),
              }))}
              matchDays={matchDays}
              availability={adminAvailability}
            />
          </>
        ) : myCategories.length === 0 ? (
          <div>
            <p className="mb-4 text-sm text-zinc-500">
              Zatiaľ nemáš vybraný žiadny región — vyber si ho nižšie, aby si
              videl/a hracie dni.
            </p>
            <RegionSwitcher monthParam={monthParam(monthKey)} />
          </div>
        ) : (
          <>
            <RegionSwitcher
              activeCategory={category}
              primaryCategory={primaryCategory}
              monthParam={monthParam(monthKey)}
            />
            <UnfilledReminder
              dates={unfilledThisMonth}
              category={category}
              nextMonth={nextUnfilledMonth}
            />
            <RefereeCalendar
              key={`${monthParam(monthKey)}-${view}-${category}`}
              monthKey={monthKey}
              category={category}
              matchDays={matchDays}
              matchDayLeagues={matchDayLeagues}
              initialAvailability={refereeAvailability}
              todayDateStr={todayDateStr()}
            />
          </>
        )}
        </main>
      </div>
    </div>
  );
}
