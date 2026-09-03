"use client";

import { useState, useTransition } from "react";
import { updateLeagueRate, updateMinHourlyWage } from "@/app/rates/actions";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/categories";
import { leaguesForCategory } from "@/lib/leagues";
import {
  TIME_TYPE_LABELS,
  volunteerBreakdown,
  type LeagueRate,
  type TimeType,
} from "@/lib/rates";

type Props = {
  rates: LeagueRate[];
  minHourlyWage: number;
};

function toNumber(value: string): number | null {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function NumberInput({
  value,
  onCommit,
  width = "w-16",
  suffix,
}: {
  value: number | null;
  onCommit: (next: number | null) => void;
  width?: string;
  suffix?: string;
}) {
  const [text, setText] = useState(value == null ? "" : String(value));

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const next = toNumber(text);
          if (next !== value) onCommit(next);
        }}
        className={`${width} rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-right text-xs text-zinc-700 outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200`}
      />
      {suffix && <span className="text-[11px] text-zinc-400">{suffix}</span>}
    </span>
  );
}

function RateRow({
  league,
  label,
  rate,
  minHourlyWage,
  onSave,
}: {
  league: string;
  label: string;
  rate: LeagueRate | undefined;
  minHourlyWage: number;
  onSave: (league: string, next: LeagueRate) => void;
}) {
  const current: LeagueRate = rate ?? {
    league,
    time_type: "hruby",
    fee: null,
    travel_supplement: null,
    volunteer_fee: null,
    volunteer_meal: null,
    volunteer_max_per_day: null,
  };

  function patch(changes: Partial<LeagueRate>) {
    onSave(league, { ...current, ...changes });
  }

  const breakdown = volunteerBreakdown(current, minHourlyWage);

  return (
    <tr className="border-t border-zinc-100 dark:border-zinc-900">
      <td className="px-2 py-2">
        <span className="font-mono text-xs font-semibold text-brand-indigo">{league}</span>
        <span className="ml-2 text-xs text-zinc-500">{label}</span>
      </td>
      <td className="px-2 py-2">
        <select
          value={current.time_type}
          onChange={(e) => patch({ time_type: e.target.value as TimeType })}
          className="rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700 outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        >
          <option value="hruby">{TIME_TYPE_LABELS.hruby}</option>
          <option value="cisty">{TIME_TYPE_LABELS.cisty}</option>
        </select>
      </td>
      <td className="px-2 py-2 text-right">
        <NumberInput value={current.fee} onCommit={(v) => patch({ fee: v })} suffix="€" />
      </td>
      <td className="px-2 py-2 text-right">
        <NumberInput
          value={current.travel_supplement}
          onCommit={(v) => patch({ travel_supplement: v })}
          suffix="€"
        />
      </td>
      <td className="px-2 py-2 text-right">
        <NumberInput
          value={current.volunteer_fee}
          onCommit={(v) => patch({ volunteer_fee: v })}
          suffix="€"
        />
      </td>
      <td className="px-2 py-2 text-right">
        <NumberInput
          value={current.volunteer_meal}
          onCommit={(v) => patch({ volunteer_meal: v })}
          suffix="€"
        />
      </td>
      <td className="px-2 py-2 text-right">
        <NumberInput
          value={current.volunteer_max_per_day}
          onCommit={(v) => patch({ volunteer_max_per_day: v })}
          width="w-12"
        />
      </td>
      <td className="px-2 py-2 text-right text-[11px] text-zinc-400">
        {breakdown ? `${breakdown.hours} h × ${minHourlyWage} = ${breakdown.timeCompensation}` : "—"}
      </td>
    </tr>
  );
}

export function RatesManager({ rates, minHourlyWage }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const [byLeague, setByLeague] = useState(
    () => new Map(rates.map((r) => [r.league, r])),
  );
  const [wage, setWage] = useState(minHourlyWage);
  const [, startTransition] = useTransition();

  function handleSave(league: string, next: LeagueRate) {
    setByLeague((prev) => new Map(prev).set(league, next));
    startTransition(async () => {
      await updateLeagueRate(league, {
        time_type: next.time_type,
        fee: next.fee,
        travel_supplement: next.travel_supplement,
        volunteer_fee: next.volunteer_fee,
        volunteer_meal: next.volunteer_meal,
        volunteer_max_per_day: next.volunteer_max_per_day,
      });
    });
  }

  if (collapsed) {
    const filled = rates.filter((r) => r.fee != null || r.volunteer_fee != null).length;
    return (
      <div className="mb-10 flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Sadzobník odmien
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Odmeny za zápas podľa súťaže — {filled} líg má nastavenú sadzbu.
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
            Sadzobník odmien
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-zinc-500">
            <span className="font-semibold">Odmena</span> platí pre SZČO aj rámcovú
            príkaznú zmluvu. <span className="font-semibold">Príplatok</span> dostane len
            SZČO, a to za cestu mimo mesta sídla firmy.{" "}
            <span className="font-semibold">Dobrovoľnícky výkaz</span> sa neplatí sumou
            priamo — skladá sa zo stravného a náhrady straty času, ktorej hodiny sa
            dopočítajú spätne (posledný stĺpec ukazuje, ako riadok výkazu vyjde).
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="shrink-0 rounded-lg bg-brand-indigo px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark"
        >
          Hotovo
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
          Minimálna hodinová mzda
        </span>
        <NumberInput
          value={wage}
          width="w-20"
          suffix="€/hod"
          onCommit={(v) => {
            if (v == null) return;
            setWage(v);
            startTransition(async () => {
              await updateMinHourlyWage(v);
            });
          }}
        />
        <span className="text-[11px] text-zinc-400">
          Mení sa každý rok — vstupuje do dobrovoľníckeho výkazu.
        </span>
      </div>

      {CATEGORIES.map((category: Category) => {
        const leagues = leaguesForCategory(category);
        if (leagues.length === 0) return null;

        return (
          <div key={category} className="mt-6">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
              {CATEGORY_LABELS[category]}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900">
                    <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-500">
                      Súťaž
                    </th>
                    <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-500">
                      Hrací čas
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-zinc-500">
                      Odmena
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-zinc-500">
                      Príplatok SZČO
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-zinc-500">
                      Dobrovoľník
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-zinc-500">
                      Stravné
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-zinc-500">
                      Max/deň
                    </th>
                    <th className="px-2 py-2 text-right text-xs font-semibold text-zinc-500">
                      Náhrada straty času
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leagues.map((league) => (
                    <RateRow
                      key={league.code}
                      league={league.code}
                      label={league.label}
                      rate={byLeague.get(league.code)}
                      minHourlyWage={wage}
                      onSave={handleSave}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
