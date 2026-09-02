import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { COMPETITIONS } from "@/lib/szfb-scraper";
import { NominationsManager } from "@/components/NominationsManager";

export default async function NominationsPage() {
  const referee = await requireUser();

  if (referee.role !== "admin") {
    redirect("/");
  }

  const supabase = await createClient();

  const [{ data: matches }, { data: celostatnyRefRows }] = await Promise.all([
    supabase
      .from("matches")
      .select("*")
      .order("match_date")
      .order("match_time"),
    supabase.from("referee_categories").select("referee_id").eq("category", "celostatny"),
  ]);

  const celostatnyIds = (celostatnyRefRows ?? []).map((r) => r.referee_id as string);

  const [{ data: referees }, { data: availabilityRows }] = await Promise.all([
    celostatnyIds.length
      ? supabase
          .from("referees")
          .select("id, full_name, license_level")
          .in("id", celostatnyIds)
          .eq("active", true)
          .order("full_name")
      : Promise.resolve({ data: [] }),
    celostatnyIds.length
      ? supabase
          .from("availability")
          .select("referee_id, available_date, status, reason, available_from, available_to")
          .eq("category", "celostatny")
          .in("referee_id", celostatnyIds)
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <>
      <AppHeader
        right={
          <a
            href="/"
            className="rounded-lg border border-white/30 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-white/10"
          >
            ← Späť na kalendár
          </a>
        }
      />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10">
        <h1 className="mb-6 text-lg font-semibold text-zinc-800 dark:text-zinc-100">
          Nominácie
        </h1>
        <NominationsManager
          competitions={COMPETITIONS}
          initialMatches={matches ?? []}
          referees={referees ?? []}
          availability={availabilityRows ?? []}
        />
      </main>
    </>
  );
}
