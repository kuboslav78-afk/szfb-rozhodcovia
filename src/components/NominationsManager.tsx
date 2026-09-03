"use client";

import { useMemo, useState, useTransition } from "react";
import {
  importCompetition,
  setMatchReferee,
  setMatchRefereeStatus,
  acknowledgeTimeChange,
  type NominationStatus,
} from "@/app/nominations/actions";
import type { AvailabilityStatus } from "@/app/availability/actions";
import type { CompetitionConfig } from "@/lib/szfb-scraper";
import type { LicenseLevel } from "@/lib/licenses";
import type { Category } from "@/lib/categories";
import { RefereePickerModal, type PickerReferee } from "@/components/RefereePickerModal";
import { ManualMatchUpdate } from "@/components/ManualMatchUpdate";
import { VenueGeocodingPanel } from "@/components/VenueGeocodingPanel";

type Referee = { id: string; full_name: string; license_level: LicenseLevel | null };

type AvailabilityRow = {
  referee_id: string;
  available_date: string;
  status: AvailabilityStatus;
  reason: string | null;
  available_from: string | null;
  available_to: string | null;
};

export type NominationMatch = {
  id: string;
  category: string;
  league: string;
  match_number: number | null;
  round: string | null;
  team_home: string;
  team_away: string;
  match_date: string;
  match_time: string | null;
  venue: string | null;
  referee1_id: string | null;
  referee1_status: NominationStatus;
  referee2_id: string | null;
  referee2_status: NominationStatus;
  previous_match_time: string | null;
  previous_match_date: string | null;
  time_changed_at: string | null;
};

type VenueCoordinates = Record<string, { lat: number; lng: number }>;

type Props = {
  category: Category;
  competitions: CompetitionConfig[];
  initialMatches: NominationMatch[];
  referees: Referee[];
  availability: AvailabilityRow[];
  readOnly: boolean;
  venueCoordinates: VenueCoordinates;
};

const STATUS_LABELS: Record<NominationStatus, string> = {
  draft: "Pripravená",
  sent: "Odoslaná, čaká na potvrdenie",
  confirmed: "Potvrdená",
  rejected: "Zamietnutá",
};

const STATUS_CLASSES: Record<NominationStatus, string> = {
  draft: "border-zinc-300 bg-white text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400",
  sent: "border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-300",
  confirmed: "border-emerald-400 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  rejected: "border-red-400 bg-red-100 text-red-800 dark:border-red-700 dark:bg-red-950 dark:text-red-300",
};

const STATUS_CYCLE: NominationStatus[] = ["draft", "sent", "confirmed", "rejected"];

// Poradie súťaží v rámci toho istého hracieho dňa — presne podľa zadania KRO.
// Ligy mimo tohto zoznamu (zatiaľ len regionálne) sa zoradia abecedne až za nimi.
const LEAGUE_PRIORITY: Record<string, number> = {
  MEX: 0,
  ZEX: 1,
  JEX: 2,
  M1: 3,
  Z1: 4,
  "DO-ZA": 5,
  "DO-VY": 5,
  "SZY-U15": 6,
};

function leaguePriority(league: string) {
  return LEAGUE_PRIORITY[league] ?? Number.MAX_SAFE_INTEGER;
}

function compareMatches(a: NominationMatch, b: NominationMatch) {
  if (a.match_date !== b.match_date) return a.match_date < b.match_date ? -1 : 1;

  const pa = leaguePriority(a.league);
  const pb = leaguePriority(b.league);
  if (pa !== pb) return pa - pb;
  if (pa === Number.MAX_SAFE_INTEGER && a.league !== b.league) {
    return a.league < b.league ? -1 : 1;
  }

  const na = a.match_number ?? Number.MAX_SAFE_INTEGER;
  const nb = b.match_number ?? Number.MAX_SAFE_INTEGER;
  return na - nb;
}

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("sk-SK", { weekday: "short", day: "numeric", month: "numeric", year: "numeric" });
}

function refereeName(referees: Referee[], id: string | null) {
  if (!id) return null;
  return referees.find((r) => r.id === id)?.full_name ?? null;
}

// Odhad, či rozhodca stihne dva zápasy v ten istý deň: zápas trvá cca 2 hodiny
// a medzi koncom prvého a začiatkom druhého potrebuje čas na presun (odhad
// vzdušnou vzdialenosťou hál pri priemernej rýchlosti 70 km/h). Keď vzdialenosť
// hál nepoznáme (haly ešte negeokódované) alebo chýba čas zápasu, radšej to
// označíme ako kolíziu — admin to vie vždy vyhľadaním mena obísť.
const MATCH_DURATION_HOURS = 2;
const AVERAGE_SPEED_KMH = 70;

function timeToHours(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function findRefereeConflict(
  refereeId: string,
  currentMatch: NominationMatch,
  allMatches: NominationMatch[],
  venueCoordinates: VenueCoordinates,
): string | null {
  const sameDay = allMatches.filter((m) => {
    if (m.id === currentMatch.id || m.match_date !== currentMatch.match_date) return false;
    if (m.referee1_id === refereeId) return m.referee1_status !== "rejected";
    if (m.referee2_id === refereeId) return m.referee2_status !== "rejected";
    return false;
  });

  for (const other of sameDay) {
    const currentStart = timeToHours(currentMatch.match_time);
    const otherStart = timeToHours(other.match_time);

    if (currentStart === null || otherStart === null) {
      return `${other.team_home} vs ${other.team_away} (rovnaký deň, čas zápasu neznámy)`;
    }

    const [earlier, later] =
      currentStart <= otherStart ? [currentMatch, other] : [other, currentMatch];
    const gapHours = timeToHours(later.match_time)! - timeToHours(earlier.match_time)! - MATCH_DURATION_HOURS;

    let travelHours: number;
    if (earlier.venue && later.venue && earlier.venue === later.venue) {
      travelHours = 0;
    } else {
      const venueA = earlier.venue ? venueCoordinates[earlier.venue] : null;
      const venueB = later.venue ? venueCoordinates[later.venue] : null;
      travelHours = venueA && venueB ? haversineKm(venueA, venueB) / AVERAGE_SPEED_KMH : Infinity;
    }

    if (gapHours < travelHours) {
      return `${other.team_home} vs ${other.team_away} (${other.match_time?.slice(0, 5) ?? "?"}, ${other.venue ?? "neznáma hala"})`;
    }
  }

  return null;
}

function ImportPanel({ competitions }: { competitions: CompetitionConfig[] }) {
  const [collapsed, setCollapsed] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<Record<string, string>>({});
  const [importingAllId, setImportingAllId] = useState<string | null>(null);
  const [allSummary, setAllSummary] = useState<string | null>(null);

  async function importOne(id: string) {
    try {
      const { created, updated, total } = await importCompetition(id);
      setResults((prev) => ({ ...prev, [id]: `${created} nových, ${updated} aktualizovaných (spolu ${total})` }));
      return { created, updated };
    } catch (error) {
      setResults((prev) => ({ ...prev, [id]: error instanceof Error ? error.message : "Chyba" }));
      return { created: 0, updated: 0 };
    }
  }

  function handleImport(id: string) {
    startTransition(async () => {
      await importOne(id);
    });
  }

  function handleImportAll() {
    setAllSummary(null);
    startTransition(async () => {
      let created = 0;
      let updated = 0;
      for (const c of competitions) {
        setImportingAllId(c.id);
        const result = await importOne(c.id);
        created += result.created;
        updated += result.updated;
      }
      setImportingAllId(null);
      setAllSummary(`Hotovo: ${created} nových, ${updated} aktualizovaných naprieč ${competitions.length} súťažami.`);
    });
  }

  if (competitions.length === 0) {
    return (
      <div className="mb-6 rounded-xl border border-dashed border-zinc-200 px-5 py-4 text-sm text-zinc-500 dark:border-zinc-800">
        Pre tento región zatiaľ nie sú nastavené žiadne súťaže na import zo szfb.sk.
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Import zo szfb.sk</h2>
          <p className="mt-1 text-xs text-zinc-500">
            {isPending && importingAllId
              ? `Importujem ${competitions.findIndex((c) => c.id === importingAllId) + 1}/${competitions.length}…`
              : (allSummary ?? "Nahraj alebo aktualizuj zápasy súťaží tohto regiónu.")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleImportAll}
            className="rounded-lg bg-brand-indigo px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:opacity-60"
          >
            Importovať všetko
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Spravovať
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Import zo szfb.sk</h2>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={isPending}
            onClick={handleImportAll}
            className="rounded-lg bg-brand-indigo px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:opacity-60"
          >
            {isPending && importingAllId
              ? `Importujem ${competitions.findIndex((c) => c.id === importingAllId) + 1}/${competitions.length}…`
              : "Importovať všetko"}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Hotovo
          </button>
        </div>
      </div>
      {allSummary && !isPending && (
        <p className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">{allSummary}</p>
      )}
      <div className="mt-4 space-y-2">
        {competitions.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-100 px-3 py-2 dark:border-zinc-900">
            <span className="text-sm text-zinc-700 dark:text-zinc-200">
              {c.league} <span className="text-zinc-400">— {c.slug.replace(/-/g, " ")}</span>
            </span>
            <div className="flex items-center gap-3">
              {results[c.id] && <span className="text-xs text-zinc-500">{results[c.id]}</span>}
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleImport(c.id)}
                className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Importovať
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RefereeSlot({
  match,
  slot,
  referees,
  availability,
  readOnly,
  allMatches,
  venueCoordinates,
}: {
  match: NominationMatch;
  slot: 1 | 2;
  referees: Referee[];
  availability: AvailabilityRow[];
  readOnly: boolean;
  allMatches: NominationMatch[];
  venueCoordinates: VenueCoordinates;
}) {
  const [, startTransition] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const refereeId = slot === 1 ? match.referee1_id : match.referee2_id;
  const status = slot === 1 ? match.referee1_status : match.referee2_status;
  const [localRefereeId, setLocalRefereeId] = useState(refereeId ?? "");
  const [localStatus, setLocalStatus] = useState(status);

  function handlePick(next: string) {
    setLocalRefereeId(next);
    setLocalStatus("draft");
    setPickerOpen(false);
    startTransition(async () => {
      await setMatchReferee(match.id, slot, next || null);
    });
  }

  function cycleStatus() {
    const nextIndex = (STATUS_CYCLE.indexOf(localStatus) + 1) % STATUS_CYCLE.length;
    const next = STATUS_CYCLE[nextIndex];
    setLocalStatus(next);
    startTransition(async () => {
      await setMatchRefereeStatus(match.id, slot, next);
    });
  }

  const pickerReferees: PickerReferee[] = referees.map((r) => {
    const row = availability.find(
      (a) => a.referee_id === r.id && a.available_date === match.match_date,
    );
    return {
      id: r.id,
      name: r.full_name,
      license: r.license_level,
      entry: row
        ? {
            status: row.status,
            reason: row.reason,
            availableFrom: row.available_from,
            availableTo: row.available_to,
          }
        : undefined,
      conflict: findRefereeConflict(r.id, match, allMatches, venueCoordinates),
    };
  });

  if (readOnly) {
    return (
      <div className="flex items-center gap-2">
        <span className="rounded-md border border-zinc-100 bg-zinc-50 px-2.5 py-1.5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
          {refereeName(referees, localRefereeId || null) ?? `— rozhodca ${slot} —`}
        </span>
        {localRefereeId && (
          <span
            title={STATUS_LABELS[localStatus]}
            className={`h-5 w-5 shrink-0 rounded-full border-2 ${STATUS_CLASSES[localStatus]}`}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-left text-sm text-zinc-700 outline-none transition hover:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      >
        {refereeName(referees, localRefereeId || null) ?? `— rozhodca ${slot} —`}
      </button>
      {localRefereeId && (
        <button
          type="button"
          title={STATUS_LABELS[localStatus]}
          onClick={cycleStatus}
          className={`h-5 w-5 shrink-0 rounded-full border-2 transition ${STATUS_CLASSES[localStatus]}`}
        />
      )}
      {localRefereeId && (
        <button
          type="button"
          title="Odstrániť nomináciu"
          onClick={() => handlePick("")}
          className="shrink-0 text-zinc-300 transition hover:text-red-600 dark:text-zinc-600 dark:hover:text-red-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
          >
            <path d="M18 6 6 18M6 6l18 18" />
          </svg>
        </button>
      )}
      {pickerOpen && (
        <RefereePickerModal
          dateStr={match.match_date}
          referees={pickerReferees}
          onPick={handlePick}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function MatchRow({
  match,
  referees,
  availability,
  newDay,
  readOnly,
  allMatches,
  venueCoordinates,
}: {
  match: NominationMatch;
  referees: Referee[];
  availability: AvailabilityRow[];
  newDay: boolean;
  readOnly: boolean;
  allMatches: NominationMatch[];
  venueCoordinates: VenueCoordinates;
}) {
  const [isPending, startTransition] = useTransition();
  const [acknowledged, setAcknowledged] = useState(false);
  const timeChanged = Boolean(match.time_changed_at) && !acknowledged;
  const previousLabel = [
    match.previous_match_date ? formatDateLabel(match.previous_match_date) : null,
    match.previous_match_time ? match.previous_match_time.slice(0, 5) : null,
  ]
    .filter(Boolean)
    .join(" ");

  function handleAcknowledge() {
    setAcknowledged(true);
    startTransition(async () => {
      await acknowledgeTimeChange(match.id);
    });
  }

  return (
    <tr
      className={`${
        newDay ? "border-t-2 border-zinc-300 dark:border-zinc-700" : "border-t border-zinc-100 dark:border-zinc-900"
      } ${timeChanged ? "bg-amber-50 dark:bg-amber-950/30" : ""}`}
    >
      <td className="whitespace-nowrap px-2 py-2 text-xs text-zinc-400">
        {match.match_number ?? "—"}
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-xs text-zinc-500">
        {formatDateLabel(match.match_date)}
        {match.match_time && <span className="block">{match.match_time}</span>}
        {timeChanged && readOnly && (
          <span className="mt-1 block w-fit rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
            {previousLabel ? `${previousLabel} → ` : ""}
            ZMENA TERMÍNU
          </span>
        )}
        {timeChanged && !readOnly && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleAcknowledge}
            title="Klikni pre potvrdenie, že si zmenu videl"
            className="mt-1 block rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-900 transition hover:bg-amber-300 dark:bg-amber-900 dark:text-amber-200"
          >
            {previousLabel ? `${previousLabel} → ` : ""}
            ZMENA TERMÍNU ✓
          </button>
        )}
      </td>
      <td className="px-2 py-2 text-sm text-zinc-800 dark:text-zinc-200">
        {match.team_home} <span className="text-zinc-400">vs</span> {match.team_away}
        {match.venue && <span className="block text-xs text-zinc-400">{match.venue}</span>}
      </td>
      <td className="px-2 py-2 text-center">
        <span className="rounded-full bg-brand-indigo/10 px-2 py-0.5 text-xs font-semibold text-brand-indigo">
          {match.league}
        </span>
      </td>
      <td className="px-2 py-2">
        <div className="flex flex-col gap-1.5">
          <RefereeSlot
            match={match}
            slot={1}
            referees={referees}
            availability={availability}
            readOnly={readOnly}
            allMatches={allMatches}
            venueCoordinates={venueCoordinates}
          />
          <RefereeSlot
            match={match}
            slot={2}
            referees={referees}
            availability={availability}
            readOnly={readOnly}
            allMatches={allMatches}
            venueCoordinates={venueCoordinates}
          />
        </div>
      </td>
    </tr>
  );
}

export function NominationsManager({
  category,
  competitions,
  initialMatches,
  referees,
  availability,
  readOnly,
  venueCoordinates,
}: Props) {
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [hideNominated, setHideNominated] = useState(false);

  const leagues = useMemo(
    () => Array.from(new Set(initialMatches.map((m) => m.league))).sort(),
    [initialMatches],
  );
  const months = useMemo(
    () => Array.from(new Set(initialMatches.map((m) => m.match_date.slice(0, 7)))).sort(),
    [initialMatches],
  );

  const searchQuery = search.trim().toLowerCase();

  const filtered = initialMatches
    .filter((m) => {
      if (leagueFilter !== "all" && m.league !== leagueFilter) return false;
      if (monthFilter !== "all" && !m.match_date.startsWith(monthFilter)) return false;
      if (hideNominated && m.referee1_id && m.referee2_id) return false;
      if (searchQuery) {
        const haystack = `${m.match_number ?? ""} ${m.team_home} ${m.team_away}`.toLowerCase();
        if (!haystack.includes(searchQuery)) return false;
      }
      return true;
    })
    .sort(compareMatches);

  return (
    <div>
      {!readOnly && (
        <>
          <ImportPanel competitions={competitions} />
          <ManualMatchUpdate category={category} />
          <VenueGeocodingPanel />
        </>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hľadať podľa čísla zápasu alebo tímu…"
          className="min-w-[220px] flex-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm outline-none transition focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        />
        <select
          value={leagueFilter}
          onChange={(e) => setLeagueFilter(e.target.value)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <option value="all">Všetky ligy</option>
          {leagues.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <option value="all">Všetky mesiace</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={hideNominated}
            onChange={(e) => setHideNominated(e.target.checked)}
            className="rounded border-zinc-300 text-brand-indigo focus:ring-brand-indigo dark:border-zinc-700"
          />
          Skryť nominované
        </label>
        <span className="self-center text-xs text-zinc-400">{filtered.length} zápasov</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900">
              <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-500">Č.z.</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-500">Dátum</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-500">Zápas</th>
              <th className="px-2 py-2 text-center text-xs font-semibold text-zinc-500">Liga</th>
              <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-500">Rozhodcovia</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m, i) => (
              <MatchRow
                key={m.id}
                match={m}
                referees={referees}
                availability={availability}
                newDay={i === 0 || filtered[i - 1].match_date !== m.match_date}
                readOnly={readOnly}
                allMatches={initialMatches}
                venueCoordinates={venueCoordinates}
              />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-zinc-400">
            {competitions.length === 0
              ? "Žiadne zápasy — pre tento región zatiaľ nie sú nastavené súťaže na import."
              : "Žiadne zápasy — importuj súťaž vyššie."}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-zinc-300 bg-white" />
          Pripravená
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-amber-400 bg-amber-100" />
          Odoslaná, čaká na potvrdenie
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-emerald-400 bg-emerald-100" />
          Potvrdená
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2 border-red-400 bg-red-100" />
          Zamietnutá
        </span>
        <span>Klikni na bodku vedľa mena pre zmenu stavu.</span>
      </div>
    </div>
  );
}
