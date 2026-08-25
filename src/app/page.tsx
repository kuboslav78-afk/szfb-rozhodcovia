import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import {
  monthGrid,
  monthParam,
  parseMonthParam,
  todayDateStr,
  toDateStr,
} from "@/lib/dates";
import { CATEGORIES, parseCategoryParam, type Category } from "@/lib/categories";
import type { LicenseLevel } from "@/lib/licenses";
import { MonthNav } from "@/components/MonthNav";
import { RefereeCalendar } from "@/components/RefereeCalendar";
import { AdminOverview } from "@/components/AdminOverview";
import { MatchDaysEditor } from "@/components/MatchDaysEditor";
import { SignOutButton } from "@/components/SignOutButton";
import { AppHeader } from "@/components/AppHeader";
import { CategoryTabs } from "@/components/CategoryTabs";
import { MyRegionsManager } from "@/components/MyRegionsManager";
import { RefereeCategoriesManager } from "@/components/RefereeCategoriesManager";
import { CategoryAdminsManager } from "@/components/CategoryAdminsManager";
import { AddRefereeForm } from "@/components/AddRefereeForm";
import {
  CancellationRequests,
  type CancellationRequestItem,
} from "@/components/CancellationRequests";
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

export default async function Home(props: PageProps<"/">) {
  const searchParams = await props.searchParams;
  const monthKey = parseMonthParam(singleParam(searchParams.month));
  const viewParamRaw = singleParam(searchParams.view);
  const categoryParamRaw = singleParam(searchParams.category);

  const referee = await requireUser();
  const supabase = await createClient();

  const isSuperAdmin = referee.role === "admin";

  const [{ data: myCategoryRows }, { data: myAdminCategoryRows }] =
    await Promise.all([
      supabase.from("referee_categories").select("category").eq("referee_id", referee.id),
      isSuperAdmin
        ? Promise.resolve({ data: null })
        : supabase.from("category_admins").select("category").eq("referee_id", referee.id),
    ]);

  const myCategories = (myCategoryRows ?? []).map((r) => r.category as Category);
  const myAdminCategories: Category[] = isSuperAdmin
    ? [...CATEGORIES]
    : (myAdminCategoryRows ?? []).map((r) => r.category as Category);

  const canSeeAdmin = myAdminCategories.length > 0;
  const view = canSeeAdmin && viewParamRaw === "moje" ? "moje" : "prehlad";
  const adminView = canSeeAdmin && view === "prehlad";

  const visibleCategories: Category[] = adminView ? myAdminCategories : myCategories;

  const requestedCategory = parseCategoryParam(categoryParamRaw);
  const category: Category = visibleCategories.includes(requestedCategory)
    ? requestedCategory
    : (visibleCategories[0] ?? "celostatny");

  const days = monthGrid(monthKey).filter((d): d is number => d !== null);
  const firstDay = toDateStr(monthKey.year, monthKey.month, days[0]);
  const lastDay = toDateStr(monthKey.year, monthKey.month, days[days.length - 1]);

  const { data: matchDayRows } = await supabase
    .from("match_days")
    .select("match_date")
    .eq("category", category)
    .gte("match_date", firstDay)
    .lte("match_date", lastDay);

  const matchDays = (matchDayRows ?? []).map((row) => row.match_date as string);

  let refereeAvailability: Record<string, DayEntry> = {};
  type RefereeRow = { id: string; full_name: string; license_level: LicenseLevel | null };
  let adminReferees: RefereeRow[] = [];
  let adminAvailability: Record<string, Record<string, DayEntry>> = {};
  let cancellationRequests: CancellationRequestItem[] = [];
  let allReferees: RefereeRow[] = [];
  let allRefereeCategories: Record<string, Category[]> = {};
  let allCategoryAdmins: Record<string, Category[]> = {};

  if (adminView) {
    const queries = [
      supabase.from("referee_categories").select("referee_id").eq("category", category),
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

    const [{ data: categoryRefRows }, { data: rows }, { data: pending }] =
      await Promise.all(queries);

    const categoryRefereeIds = new Set(
      (categoryRefRows ?? []).map((r) => r.referee_id as string),
    );

    if (isSuperAdmin) {
      const [{ data: allRefs }, { data: allCatRows }, { data: allAdminRows }] =
        await Promise.all([
          supabase
            .from("referees")
            .select("id, full_name, license_level")
            .eq("active", true)
            .order("full_name"),
          supabase.from("referee_categories").select("referee_id, category"),
          supabase.from("category_admins").select("referee_id, category"),
        ]);

      allReferees = allRefs ?? [];

      allRefereeCategories = {};
      for (const row of allCatRows ?? []) {
        const id = row.referee_id as string;
        allRefereeCategories[id] ??= [];
        allRefereeCategories[id].push(row.category as Category);
      }

      allCategoryAdmins = {};
      for (const row of allAdminRows ?? []) {
        const id = row.referee_id as string;
        allCategoryAdmins[id] ??= [];
        allCategoryAdmins[id].push(row.category as Category);
      }
    }

    if (isSuperAdmin) {
      adminReferees = allReferees.filter((r) => categoryRefereeIds.has(r.id));
    } else if (categoryRefereeIds.size > 0) {
      const { data: catReferees } = await supabase
        .from("referees")
        .select("id, full_name, license_level")
        .in("id", Array.from(categoryRefereeIds))
        .eq("active", true)
        .order("full_name");
      adminReferees = catReferees ?? [];
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

  return (
    <>
      <AppHeader
        right={
          <div className="flex items-center gap-3 sm:gap-4">
            <a
              href="/profil"
              className="hidden text-sm font-medium text-white hover:underline sm:block"
            >
              {referee.full_name}
              {isSuperAdmin ? " · admin" : ""}
            </a>
            <a
              href="/profil"
              aria-label="Môj profil"
              title="Môj profil"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/30 text-white transition hover:bg-white/10 sm:hidden"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
              </svg>
            </a>
            <SignOutButton />
          </div>
        }
      />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">
              {adminView ? "Prehľad dostupnosti" : "Moja dostupnosť"}
            </h1>

            {canSeeAdmin && (
              <div className="ml-2 flex rounded-lg border border-zinc-200 p-0.5 text-sm dark:border-zinc-800">
                <a
                  href={`/?month=${monthParam(monthKey)}&category=${category}`}
                  className={`rounded-md px-3 py-1 font-medium transition ${
                    view === "prehlad"
                      ? "bg-brand-indigo text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  Prehľad
                </a>
                <a
                  href={`/?month=${monthParam(monthKey)}&view=moje`}
                  className={`rounded-md px-3 py-1 font-medium transition ${
                    view === "moje"
                      ? "bg-brand-indigo text-white"
                      : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  Moja dostupnosť
                </a>
              </div>
            )}
          </div>

          <MonthNav monthKey={monthKey} view={canSeeAdmin ? view : undefined} />
        </div>

        <CategoryTabs
          categories={visibleCategories}
          active={category}
          monthKey={monthKey}
          view={canSeeAdmin ? view : undefined}
        />

        {adminView ? (
          <>
            {isSuperAdmin && (
              <>
                <AddRefereeForm />
                <RefereeCategoriesManager
                  referees={allReferees}
                  initialCategories={allRefereeCategories}
                />
                <CategoryAdminsManager
                  referees={allReferees}
                  initialAdmins={allCategoryAdmins}
                />
              </>
            )}
            <CancellationRequests items={cancellationRequests} />
            <MatchDaysEditor
              key={`${monthParam(monthKey)}-${category}`}
              monthKey={monthKey}
              category={category}
              initialMatchDays={matchDays}
            />
            <AdminOverview
              monthKey={monthKey}
              referees={adminReferees}
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
            <MyRegionsManager myCategories={myCategories} />
          </div>
        ) : (
          <>
            <MyRegionsManager myCategories={myCategories} />
            <RefereeCalendar
              key={`${monthParam(monthKey)}-${view}-${category}`}
              monthKey={monthKey}
              category={category}
              matchDays={matchDays}
              initialAvailability={refereeAvailability}
              todayDateStr={todayDateStr()}
            />
          </>
        )}
      </main>
    </>
  );
}
