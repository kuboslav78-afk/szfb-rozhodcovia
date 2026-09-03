"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  type MonthKey,
  monthGrid,
  toDateStr,
  weekdayLabels,
} from "@/lib/dates";
import {
  setMatchDay,
  setMatchDayLeagues,
  syncMatchDaysFromNominations,
} from "@/app/match-days/actions";
import type { Category } from "@/lib/categories";
import { leaguesForCategory } from "@/lib/leagues";

type Props = {
  monthKey: MonthKey;
  category: Category;
  initialMatchDays: string[];
  initialLeagues: Record<string, string[]>;
  /** Dni v tomto mesiaci, na ktoré sú naimportované zápasy. */
  datesWithMatches: string[];
};

function formatSummary(dates: string[]) {
  return dates
    .slice()
    .sort()
    .map((d) => Number(d.split("-")[2]))
    .join(", ");
}

function formatDayLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("sk-SK", { weekday: "short", day: "numeric", month: "numeric" });
}

export function MatchDaysEditor({
  monthKey,
  category,
  initialMatchDays,
  initialLeagues,
  datesWithMatches,
}: Props) {
  const [matchDays, setMatchDays] = useState(new Set(initialMatchDays));
  const [leagues, setLeaguesState] = useState(initialLeagues);
  const [collapsed, setCollapsed] = useState(initialMatchDays.length > 0);
  const [isPending, startTransition] = useTransition();
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const router = useRouter();

  // Pri importe zo szfb.sk sa hracie dni dopočítajú samy; toto je na dobehnutie
  // zápasov, ktoré sú v databáze ešte spred zavedenia automatiky.
  async function handleSync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { created, updated } = await syncMatchDaysFromNominations(category);
      setSyncResult(
        created === 0 && updated === 0
          ? "Všetko už sedí s nomináciami."
          : `Pridaných ${created} dní, upravené ligy pri ${updated}.`,
      );
      router.refresh();
    } catch (error) {
      setSyncResult(error instanceof Error ? error.message : "Nepodarilo sa dopočítať.");
    } finally {
      setSyncing(false);
    }
  }

  const availableLeagues = leaguesForCategory(category);

  const cells = monthGrid(monthKey);

  // Hrací deň bez zápasov je buď zadaný dopredu (rozpis ešte nie je na szfb.sk),
  // alebo zvyšok po zápase, ktorý sa presunul inam. Import dni nikdy nemaže, tak
  // nech sú aspoň vidieť a admin sa vie rozhodnúť.
  const withMatches = new Set(datesWithMatches);
  const emptyDays = Array.from(matchDays)
    .filter((date) => !withMatches.has(date))
    .sort();

  function toggleLeague(date: string, code: string) {
    const current = leagues[date] ?? [];
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];

    setLeaguesState((prev) => ({ ...prev, [date]: next }));

    startTransition(async () => {
      await setMatchDayLeagues(date, category, next);
    });
  }

  function handleClick(day: number) {
    const dateStr = toDateStr(monthKey.year, monthKey.month, day);
    const isCurrentlyMatchDay = matchDays.has(dateStr);
    const next = !isCurrentlyMatchDay;

    setMatchDays((prev) => {
      const copy = new Set(prev);
      if (next) {
        copy.add(dateStr);
      } else {
        copy.delete(dateStr);
      }
      return copy;
    });

    startTransition(async () => {
      await setMatchDay(dateStr, next, category);
    });
  }

  if (collapsed) {
    const sorted = Array.from(matchDays);

    return (
      <div className="mb-10 flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Hracie dni potvrdené
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {sorted.length > 0
              ? `${sorted.length} dní: ${formatSummary(sorted)}.`
              : "Žiadne hracie dni nie sú nastavené."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Upraviť
        </button>
      </div>
    );
  }

  return (
    <div className="mb-10 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Hracie dni
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Dni, v ktoré sa podľa naimportovaných zápasov hrá, sa dopĺňajú samy —
            klikaním pridáš deň navyše (napr. keď rozpis ešte nie je na szfb.sk).
          </p>
          {syncResult && (
            <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{syncResult}</p>
          )}
          {emptyDays.length > 0 && (
            <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-500">
              <span className="font-semibold">
                {emptyDays.length === 1
                  ? "1 hrací deň nemá žiadne zápasy"
                  : `${emptyDays.length} hracích dní nemá žiadne zápasy`}
              </span>{" "}
              ({emptyDays.map((d) => Number(d.split("-")[2])).join(", ")}) — buď rozpis ešte
              nie je na szfb.sk, alebo sa zápasy presunuli inam. Klikom ich odstrániš.
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            disabled={syncing}
            onClick={handleSync}
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            {syncing ? "Dopočítavam…" : "Dopočítať z nominácií"}
          </button>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="rounded-lg bg-brand-indigo px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark"
          >
            Potvrdiť
          </button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-zinc-400">
        {weekdayLabels().map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} />;
          }

          const dateStr = toDateStr(monthKey.year, monthKey.month, day);
          const isMatchDay = matchDays.has(dateStr);
          const isEmpty = isMatchDay && !withMatches.has(dateStr);

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleClick(day)}
              disabled={isPending}
              title={isEmpty ? "Hrací deň bez naimportovaných zápasov" : undefined}
              className={`relative flex h-12 w-full items-center justify-center rounded-lg text-sm font-medium transition disabled:cursor-default ${
                isEmpty
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : isMatchDay
                    ? "bg-brand-indigo text-white hover:bg-brand-indigo-dark"
                    : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800"
              }`}
            >
              {day}
              {isEmpty && (
                <span className="absolute right-1 top-0.5 text-[10px] leading-none">!</span>
              )}
            </button>
          );
        })}
      </div>

      {availableLeagues.length > 0 && matchDays.size > 0 && (
        <div className="mt-6 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
            Ktoré ligy sa v daný deň hrajú?
          </p>
          <div className="mt-3 space-y-3">
            {Array.from(matchDays)
              .sort()
              .map((date) => (
                <div key={date} className="flex flex-wrap items-center gap-2">
                  <span className="w-16 shrink-0 text-xs font-semibold capitalize text-zinc-500">
                    {formatDayLabel(date)}
                  </span>
                  {availableLeagues.map((league) => {
                    const active = (leagues[date] ?? []).includes(league.code);
                    return (
                      <button
                        key={league.code}
                        type="button"
                        disabled={isPending}
                        onClick={() => toggleLeague(date, league.code)}
                        title={league.label}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition disabled:cursor-default ${
                          active
                            ? "border-brand-indigo bg-brand-indigo text-white"
                            : "border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800"
                        }`}
                      >
                        {league.code}
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
