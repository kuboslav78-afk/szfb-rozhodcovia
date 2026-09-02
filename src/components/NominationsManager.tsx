"use client";

import { useMemo, useState, useTransition } from "react";
import {
  importCompetition,
  setMatchReferee,
  setMatchRefereeStatus,
  type NominationStatus,
} from "@/app/nominations/actions";
import type { AvailabilityStatus } from "@/app/availability/actions";
import type { CompetitionConfig } from "@/lib/szfb-scraper";
import type { LicenseLevel } from "@/lib/licenses";
import { RefereePickerModal, type PickerReferee } from "@/components/RefereePickerModal";

type Referee = { id: string; full_name: string; license_level: LicenseLevel | null };

type AvailabilityRow = {
  referee_id: string;
  available_date: string;
  status: AvailabilityStatus;
  reason: string | null;
  available_from: string | null;
  available_to: string | null;
};

type Match = {
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
};

type Props = {
  competitions: CompetitionConfig[];
  initialMatches: Match[];
  referees: Referee[];
  availability: AvailabilityRow[];
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

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("sk-SK", { weekday: "short", day: "numeric", month: "numeric", year: "numeric" });
}

function refereeName(referees: Referee[], id: string | null) {
  if (!id) return null;
  return referees.find((r) => r.id === id)?.full_name ?? null;
}

function matchText(match: Match, referees: Referee[]) {
  const lines = [
    `${match.team_home} vs ${match.team_away}`,
    `${formatDateLabel(match.match_date)}${match.match_time ? `, ${match.match_time}` : ""}`,
    match.venue ? match.venue : "miesto zatiaľ neurčené",
    `Liga: ${match.league}`,
    match.match_number != null ? `Č.z.: ${match.match_number}` : null,
    `Rozhodcovia: ${refereeName(referees, match.referee1_id) ?? "—"}, ${refereeName(referees, match.referee2_id) ?? "—"}`,
  ].filter((line): line is string => line !== null);
  return lines.join("\n");
}

function ImportPanel({ competitions }: { competitions: CompetitionConfig[] }) {
  const [collapsed, setCollapsed] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<Record<string, string>>({});

  function handleImport(id: string) {
    startTransition(async () => {
      try {
        const { created, updated, total } = await importCompetition(id);
        setResults((prev) => ({ ...prev, [id]: `${created} nových, ${updated} aktualizovaných (spolu ${total})` }));
      } catch (error) {
        setResults((prev) => ({ ...prev, [id]: error instanceof Error ? error.message : "Chyba" }));
      }
    });
  }

  if (collapsed) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Import zo szfb.sk</h2>
          <p className="mt-1 text-xs text-zinc-500">Nahraj alebo aktualizuj zápasy jednotlivých súťaží.</p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Spravovať
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Import zo szfb.sk</h2>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="shrink-0 rounded-lg bg-brand-indigo px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark"
        >
          Hotovo
        </button>
      </div>
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
}: {
  match: Match;
  slot: 1 | 2;
  referees: Referee[];
  availability: AvailabilityRow[];
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
    };
  });

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-left text-xs text-zinc-700 outline-none transition hover:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
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
}: {
  match: Match;
  referees: Referee[];
  availability: AvailabilityRow[];
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  async function handleCopy() {
    const text = matchText(match, referees);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Kopírovanie do schránky môže prehliadač odmietnuť (chýbajúce
      // oprávnenie, starší prehliadač) — zobraz text aspoň na ručné skopírovanie.
      setCopyError(true);
      window.prompt("Skopíruj text ručne (Ctrl/Cmd+C):", text);
    }
  }

  return (
    <tr className="border-t border-zinc-100 dark:border-zinc-900">
      <td className="whitespace-nowrap px-2 py-2 text-xs text-zinc-400">
        {match.match_number ?? "—"}
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-xs text-zinc-500">
        {formatDateLabel(match.match_date)}
        {match.match_time && <span className="block">{match.match_time}</span>}
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
          <RefereeSlot match={match} slot={1} referees={referees} availability={availability} />
          <RefereeSlot match={match} slot={2} referees={referees} availability={availability} />
        </div>
      </td>
      <td className="px-2 py-2 text-center">
        <button
          type="button"
          onClick={handleCopy}
          className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
            copyError
              ? "border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          }`}
        >
          {copied ? "Skopírované" : copyError ? "Skopíruj ručne" : "Kopírovať"}
        </button>
      </td>
    </tr>
  );
}

export function NominationsManager({ competitions, initialMatches, referees, availability }: Props) {
  const [leagueFilter, setLeagueFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");

  const leagues = useMemo(
    () => Array.from(new Set(initialMatches.map((m) => m.league))).sort(),
    [initialMatches],
  );
  const months = useMemo(
    () => Array.from(new Set(initialMatches.map((m) => m.match_date.slice(0, 7)))).sort(),
    [initialMatches],
  );

  const filtered = initialMatches.filter(
    (m) =>
      (leagueFilter === "all" || m.league === leagueFilter) &&
      (monthFilter === "all" || m.match_date.startsWith(monthFilter)),
  );

  return (
    <div>
      <ImportPanel competitions={competitions} />

      <div className="mb-4 flex flex-wrap gap-3">
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
              <th className="px-2 py-2 text-center text-xs font-semibold text-zinc-500"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <MatchRow key={m.id} match={m} referees={referees} availability={availability} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-zinc-400">
            Žiadne zápasy — importuj súťaž vyššie.
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
