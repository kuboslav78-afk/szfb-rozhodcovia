"use client";

import { useState } from "react";
import type { TestResults } from "@/lib/test-results";

function rateColour(rate: number) {
  if (rate >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (rate >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export function TestResultsPanel({ results }: { results: TestResults }) {
  const [showAll, setShowAll] = useState(false);
  const [showNever, setShowNever] = useState(false);

  const visible = showAll ? results.referees : results.referees.slice(0, 10);

  return (
    <div className="mb-6 flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            Tento týždeň
          </div>
          <div className="font-headline mt-2 text-3xl text-zinc-800 dark:text-zinc-100">
            {results.thisWeekDone}
            <span className="text-lg text-zinc-400"> / {results.thisWeekTotal}</span>
          </div>
          <div className="mt-1 text-xs text-zinc-400">odoslaných testov</div>
        </div>

        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            Dlhodobá úspešnosť
          </div>
          <div
            className={`font-headline mt-2 text-3xl ${
              results.overallRate == null ? "text-zinc-400" : rateColour(results.overallRate)
            }`}
          >
            {results.overallRate == null ? "—" : `${results.overallRate} %`}
          </div>
          <div className="mt-1 text-xs text-zinc-400">
            zo všetkých odoslaných odpovedí
          </div>
        </div>

        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="text-xs font-semibold tracking-wide text-zinc-400 uppercase">
            Ešte netestovaní
          </div>
          <div className="font-headline mt-2 text-3xl text-zinc-800 dark:text-zinc-100">
            {results.neverTook.length}
          </div>
          <button
            type="button"
            onClick={() => setShowNever(!showNever)}
            className="mt-1 text-xs text-brand-indigo hover:underline"
          >
            {showNever ? "skryť mená" : "zobraziť mená"}
          </button>
        </div>
      </div>

      {showNever && results.neverTook.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          <span className="font-semibold">Ani raz neodoslali test:</span>{" "}
          {results.neverTook.map((r) => r.refereeName).join(", ")}
        </div>
      )}

      {results.referees.length > 0 && (
        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
              Úspešnosť rozhodcov
            </h2>
            {results.referees.length > 10 && (
              <button
                type="button"
                onClick={() => setShowAll(!showAll)}
                className="text-xs text-brand-indigo hover:underline"
              >
                {showAll ? "zobraziť len prvých 10" : `zobraziť všetkých ${results.referees.length}`}
              </button>
            )}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-900">
                  <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-500">
                    Rozhodca
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-zinc-500">
                    Testov
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-zinc-500">
                    Posledný
                  </th>
                  <th className="px-2 py-2 text-right text-xs font-semibold text-zinc-500">
                    Dlhodobo
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-zinc-500">
                    Tento týždeň
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr
                    key={r.refereeId}
                    className="border-t border-zinc-100 dark:border-zinc-900"
                  >
                    <td className="px-2 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                      {r.refereeName}
                    </td>
                    <td className="px-2 py-2 text-right text-zinc-600 dark:text-zinc-300">
                      {r.taken}
                    </td>
                    <td className="px-2 py-2 text-right text-zinc-600 dark:text-zinc-300">
                      {r.lastScore == null ? "—" : `${r.lastScore}/10`}
                    </td>
                    <td
                      className={`px-2 py-2 text-right font-semibold ${rateColour(r.successRate)}`}
                    >
                      {r.successRate} %
                    </td>
                    <td className="px-2 py-2 text-center">
                      {r.doneThisWeek ? (
                        <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                      ) : (
                        <span className="text-zinc-300 dark:text-zinc-700">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {results.hardest.length > 0 && (
        <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Najhoršie zvládnuté otázky
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Kde rozhodcovia chybujú najviac — podklad na doškolenie. Počítajú sa len
            otázky, ktoré už dostali aspoň traja.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {results.hardest.map((q) => (
              <div key={q.question} className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-zinc-700 dark:text-zinc-300">{q.question}</div>
                  {q.topic && <div className="text-[11px] text-zinc-400">{q.topic}</div>}
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-sm font-semibold ${rateColour(q.rate)}`}>
                    {q.rate} %
                  </div>
                  <div className="text-[11px] text-zinc-400">{q.attempts}×</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
