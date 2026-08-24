"use client";

import { useState } from "react";
import { type MonthKey, toDateStr } from "@/lib/dates";
import type { AvailabilityStatus } from "@/app/availability/actions";
import type { LicenseLevel } from "@/lib/licenses";
import { DayNominationModal } from "@/components/DayNominationModal";
import { LicenseBadge } from "@/components/LicenseBadge";

type Referee = { id: string; full_name: string; license_level: LicenseLevel | null };
type DayEntry = {
  status: AvailabilityStatus;
  reason: string | null;
  availableFrom: string | null;
  availableTo: string | null;
  cancelRequested: boolean;
};

type Props = {
  monthKey: MonthKey;
  referees: Referee[];
  matchDays: string[];
  availability: Record<string, Record<string, DayEntry>>;
};

function dotClasses(status: AvailabilityStatus | undefined) {
  if (status === "available") {
    return "bg-emerald-400 dark:bg-emerald-500";
  }
  if (status === "limited") {
    return "bg-amber-400 dark:bg-amber-500";
  }
  if (status === "unavailable") {
    return "bg-red-400 dark:bg-red-500";
  }
  return "bg-zinc-200 dark:bg-zinc-800";
}

function statusLabel(entry: DayEntry | undefined) {
  if (!entry) return "nevyplnené";

  const base = (() => {
    if (entry.status === "available") return "dostupný celý deň";
    if (entry.status === "unavailable") return "nedostupný";

    const time =
      entry.availableFrom && entry.availableTo
        ? ` (${entry.availableFrom.slice(0, 5)}–${entry.availableTo.slice(0, 5)})`
        : "";

    return entry.reason
      ? `obmedzene dostupný — ${entry.reason}${time}`
      : `obmedzene dostupný${time}`;
  })();

  return entry.cancelRequested ? `${base} (žiadosť o zrušenie)` : base;
}

export function AdminOverview({
  monthKey,
  referees,
  matchDays,
  availability,
}: Props) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const days = matchDays
    .map((dateStr) => Number(dateStr.split("-")[2]))
    .sort((a, b) => a - b);

  if (referees.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Zatiaľ nie sú zaregistrovaní žiadni rozhodcovia.
      </p>
    );
  }

  if (days.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Zatiaľ nie sú nastavené žiadne hracie dni pre tento mesiac — pridaj ich
        vyššie.
      </p>
    );
  }

  const selectedDateStr =
    selectedDay !== null
      ? toDateStr(monthKey.year, monthKey.month, selectedDay)
      : null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 bg-zinc-50 px-3 py-2 text-left font-semibold text-zinc-600 dark:bg-black dark:text-zinc-300">
              Rozhodca
            </th>
            {days.map((day) => (
              <th key={day} className="min-w-[28px] px-0.5 py-2 text-center">
                <button
                  type="button"
                  onClick={() => setSelectedDay(day)}
                  className="rounded px-1.5 py-0.5 text-xs font-semibold text-zinc-500 transition hover:bg-brand-indigo hover:text-white dark:text-zinc-400"
                  title="Zobraziť koho možno osloviť na tento deň"
                >
                  {day}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {referees.map((referee) => {
            const refereeAvailability = availability[referee.id] ?? {};

            return (
              <tr
                key={referee.id}
                className="border-t border-zinc-100 dark:border-zinc-900"
              >
                <td className="sticky left-0 whitespace-nowrap bg-white px-3 py-2 font-medium text-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
                  {referee.full_name}
                  <LicenseBadge level={referee.license_level} />
                </td>
                {days.map((day) => {
                  const dateStr = toDateStr(monthKey.year, monthKey.month, day);
                  const entry = refereeAvailability[dateStr];

                  return (
                    <td key={day} className="px-0.5 py-2 text-center">
                      <span
                        title={statusLabel(entry)}
                        className={`mx-auto block h-3 w-3 rounded-full ${dotClasses(entry?.status)} ${
                          entry?.cancelRequested
                            ? "ring-2 ring-amber-500 ring-offset-1 dark:ring-offset-black"
                            : ""
                        }`}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-400 dark:bg-emerald-500" />
          Dostupný celý deň
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-amber-400 dark:bg-amber-500" />
          Obmedzene
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-400 dark:bg-red-500" />
          Nedostupný
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-zinc-200 dark:bg-zinc-800" />
          Nevyplnené
        </span>
        <span className="ml-auto">Klikni na dátum v hlavičke pre zoznam na nomináciu.</span>
      </div>

      {selectedDateStr && (
        <DayNominationModal
          dateStr={selectedDateStr}
          referees={referees.map((referee) => ({
            name: referee.full_name,
            license: referee.license_level,
            entry: (availability[referee.id] ?? {})[selectedDateStr],
          }))}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
