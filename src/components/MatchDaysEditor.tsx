"use client";

import { useState, useTransition } from "react";
import {
  type MonthKey,
  monthGrid,
  toDateStr,
  weekdayLabels,
} from "@/lib/dates";
import { setMatchDay } from "@/app/match-days/actions";
import type { Category } from "@/lib/categories";

type Props = {
  monthKey: MonthKey;
  category: Category;
  initialMatchDays: string[];
};

function formatSummary(dates: string[]) {
  return dates
    .slice()
    .sort()
    .map((d) => Number(d.split("-")[2]))
    .join(", ");
}

export function MatchDaysEditor({ monthKey, category, initialMatchDays }: Props) {
  const [matchDays, setMatchDays] = useState(new Set(initialMatchDays));
  const [collapsed, setCollapsed] = useState(initialMatchDays.length > 0);
  const [isPending, startTransition] = useTransition();

  const cells = monthGrid(monthKey);

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
            Klikni na dni, ktoré chceš ponúknuť rozhodcom na vyplnenie
            dostupnosti.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="shrink-0 rounded-lg bg-brand-indigo px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark"
        >
          Potvrdiť
        </button>
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

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleClick(day)}
              disabled={isPending}
              className={`flex h-12 w-full items-center justify-center rounded-lg text-sm font-medium transition disabled:cursor-default ${
                isMatchDay
                  ? "bg-brand-indigo text-white hover:bg-brand-indigo-dark"
                  : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
