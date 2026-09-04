"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { EarningEntry } from "@/lib/earnings";

const MONTH_NAMES = [
  "január", "február", "marec", "apríl", "máj", "jún",
  "júl", "august", "september", "október", "november", "december",
];

function monthLabel(month: string) {
  const [year, mon] = month.split("-").map(Number);
  return `${MONTH_NAMES[mon - 1]} ${year}`;
}

function dayLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("sk-SK", {
    weekday: "short",
    day: "numeric",
    month: "numeric",
  });
}

function eur(value: number) {
  return `${value.toFixed(2)} €`;
}

const TRAVEL_STORAGE_KEY = "szfb_cestovne";

/**
 * Cestovné si rozhodca dopisuje len pre seba — cestovný príkaz sa cez portál
 * nerieši a do výplat nevstupuje. Držíme ho preto v prehliadači, nie v databáze.
 *
 * Malý externý store namiesto stavu v efekte: server o localStorage nevie, takže
 * prvý render musí vyjsť prázdny a až potom sa načíta uložená hodnota.
 */
type TravelMap = Record<string, number>;

const EMPTY_TRAVEL: TravelMap = {};
const travelListeners = new Set<() => void>();
let travelCache: TravelMap | null = null;

function readTravel(): TravelMap {
  if (travelCache) return travelCache;
  try {
    const raw = localStorage.getItem(TRAVEL_STORAGE_KEY);
    travelCache = raw ? (JSON.parse(raw) as TravelMap) : EMPTY_TRAVEL;
  } catch {
    travelCache = EMPTY_TRAVEL;
  }
  return travelCache;
}

function writeTravel(next: TravelMap) {
  travelCache = next;
  try {
    localStorage.setItem(TRAVEL_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Súkromné okno alebo zakázané úložisko — hodnota vydrží aspoň do reloadu.
  }
  for (const listener of travelListeners) listener();
}

function subscribeTravel(listener: () => void) {
  travelListeners.add(listener);
  return () => travelListeners.delete(listener);
}

function serverTravel(): TravelMap {
  return EMPTY_TRAVEL;
}

type Props = {
  entries: EarningEntry[];
  /** KRO vidí mená; rozhodca má na stránke len svoje zápasy a môže si dopísať cestovné. */
  showReferee: boolean;
};

export function EarningsBreakdown({ entries, showReferee }: Props) {
  const [openMonths, setOpenMonths] = useState<Set<string>>(new Set());
  const travel = useSyncExternalStore(subscribeTravel, readTravel, serverTravel);

  function setTravelFor(key: string, value: number | null) {
    const next = { ...travel };
    if (value == null || value === 0) delete next[key];
    else next[key] = value;
    writeTravel(next);
  }

  const travelFor = (entry: EarningEntry) =>
    travel[`${entry.matchId}|${entry.refereeId}`] ?? 0;

  const months = useMemo(() => {
    const grouped = new Map<string, EarningEntry[]>();
    for (const entry of entries) {
      const month = entry.matchDate.slice(0, 7);
      if (!grouped.has(month)) grouped.set(month, []);
      grouped.get(month)!.push(entry);
    }

    return Array.from(grouped.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([month, rows]) => {
        const played = rows.filter((r) => r.played);
        const cp = (r: EarningEntry) => travel[`${r.matchId}|${r.refereeId}`] ?? 0;
        return {
          month,
          rows: rows.sort((a, b) => a.matchDate.localeCompare(b.matchDate)),
          playedCount: played.length,
          upcomingCount: rows.length - played.length,
          fees: rows.reduce((s, r) => s + r.fee, 0),
          supplements: rows.reduce((s, r) => s + r.supplement, 0),
          travel: rows.reduce((s, r) => s + cp(r), 0),
          total: rows.reduce((s, r) => s + r.total + cp(r), 0),
        };
      });
    // travel je v závislostiach zámerne — súčty sa majú prepočítať pri zmene
  }, [entries, travel]);

  const seasonPlayed = entries
    .filter((e) => e.played)
    .reduce((s, e) => s + e.total + travelFor(e), 0);
  const seasonUpcoming = entries
    .filter((e) => !e.played)
    .reduce((s, e) => s + e.total + travelFor(e), 0);

  function toggle(month: string) {
    setOpenMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) next.delete(month);
      else next.add(month);
      return next;
    });
  }

  if (entries.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-zinc-200 px-5 py-10 text-center text-sm text-zinc-400 dark:border-zinc-800">
        Zatiaľ tu nie je žiadna potvrdená nominácia — odmeny sa začnú počítať po prvom
        odpískanom zápase.
      </p>
    );
  }

  const colSpan = showReferee ? 5 : 4;

  return (
    <div>
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            Odpískané za sezónu
          </div>
          <div className="font-headline mt-2 text-3xl text-zinc-800 dark:text-zinc-100">
            {eur(seasonPlayed)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            {entries.filter((e) => e.played).length} zápasov
          </div>
        </div>
        <div className="rounded-xl border border-dashed border-zinc-200 p-5 dark:border-zinc-800">
          <div className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            Čaká na odohranie
          </div>
          <div className="font-headline mt-2 text-3xl text-zinc-500">
            {eur(seasonUpcoming)}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            {entries.filter((e) => !e.played).length} potvrdených nominácií
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {months.map((m) => {
          const open = openMonths.has(m.month);
          return (
            <div
              key={m.month}
              className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800"
            >
              <button
                type="button"
                onClick={() => toggle(m.month)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-zinc-50 dark:hover:bg-zinc-900"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-800 capitalize dark:text-zinc-100">
                    {monthLabel(m.month)}
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-400">
                    {m.playedCount} odpískaných
                    {m.upcomingCount > 0 && ` · ${m.upcomingCount} čaká`}
                    {m.supplements > 0 && ` · príplatky ${eur(m.supplements)}`}
                    {m.travel > 0 && ` · cestovné ${eur(m.travel)}`}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-headline text-lg text-zinc-800 dark:text-zinc-100">
                    {eur(m.total)}
                  </span>
                  <span className="text-zinc-300 dark:text-zinc-600">{open ? "▲" : "▼"}</span>
                </div>
              </button>

              {open && (
                <div className="overflow-x-auto border-t border-zinc-100 dark:border-zinc-900">
                  <table className="w-full border-collapse text-sm whitespace-nowrap">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-900">
                        <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">
                          Dátum
                        </th>
                        {showReferee && (
                          <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">
                            Rozhodca
                          </th>
                        )}
                        <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">
                          Liga
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500">
                          Zápas
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-500">
                          Odmena
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-500">
                          Príplatok
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-500">
                          Cestovné
                        </th>
                        <th className="px-3 py-2 text-right text-xs font-semibold text-zinc-500">
                          Spolu
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.rows.map((row) => {
                        const key = `${row.matchId}|${row.refereeId}`;
                        const cp = travelFor(row);
                        return (
                          <tr
                            key={key}
                            className={`border-t border-zinc-100 dark:border-zinc-900 ${
                              row.played ? "" : "text-zinc-400"
                            }`}
                          >
                            <td className="px-3 py-2 text-xs">
                              {dayLabel(row.matchDate)}
                              {!row.played && (
                                <span className="ml-1.5 rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] dark:bg-zinc-800">
                                  ešte nebol
                                </span>
                              )}
                            </td>
                            {showReferee && (
                              <td className="px-3 py-2 font-medium text-zinc-700 dark:text-zinc-300">
                                {row.refereeName}
                              </td>
                            )}
                            <td className="px-3 py-2">
                              <span className="rounded-full bg-brand-indigo/10 px-2 py-0.5 text-xs font-semibold text-brand-indigo">
                                {row.league}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-zinc-700 dark:text-zinc-300">
                              {row.teams}
                              {row.venueLabel && (
                                <span className="block text-[11px] text-zinc-400">
                                  {row.venueLabel}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">
                              {eur(row.fee)}
                            </td>
                            <td className="px-3 py-2 text-right text-zinc-700 dark:text-zinc-300">
                              {row.supplement > 0 ? (
                                eur(row.supplement)
                              ) : (
                                <span className="text-zinc-300 dark:text-zinc-700">—</span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {showReferee ? (
                                <span className="text-zinc-300 dark:text-zinc-700">—</span>
                              ) : (
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  defaultValue={cp === 0 ? "" : String(cp)}
                                  placeholder="0"
                                  onBlur={(e) => {
                                    const parsed = Number(
                                      e.target.value.trim().replace(",", "."),
                                    );
                                    setTravelFor(
                                      key,
                                      Number.isFinite(parsed) && parsed > 0 ? parsed : null,
                                    );
                                  }}
                                  className="w-20 rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-right text-xs outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                                />
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-zinc-800 dark:text-zinc-200">
                              {eur(row.total + cp)}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900">
                        <td
                          className="px-3 py-2 text-xs font-semibold text-zinc-500"
                          colSpan={colSpan - 1}
                        >
                          Spolu za {monthLabel(m.month)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                          {eur(m.fees)}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                          {m.supplements > 0 ? eur(m.supplements) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                          {m.travel > 0 ? eur(m.travel) : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {eur(m.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-zinc-400">
        Odmeny a príplatky sú prepočítané podľa sadzobníka z potvrdených nominácií;
        rozhodujúce je vyúčtovanie, ktoré pripravuje KRO.
        {!showReferee &&
          " Cestovné si dopisuješ sám — portál cestovné príkazy nerieši, hodnota ostáva len v tomto prehliadači a slúži ti na kontrolu, koľko ti má prísť na účet."}
      </p>
    </div>
  );
}
