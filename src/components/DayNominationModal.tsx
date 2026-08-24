"use client";

import type { AvailabilityStatus } from "@/app/availability/actions";
import type { LicenseLevel } from "@/lib/licenses";
import { LicenseBadge } from "@/components/LicenseBadge";

type DayEntry = {
  status: AvailabilityStatus;
  reason: string | null;
  availableFrom: string | null;
  availableTo: string | null;
  cancelRequested: boolean;
};

type RefereeStatus = {
  name: string;
  license?: LicenseLevel | null;
  entry: DayEntry | undefined;
};

type Props = {
  dateStr: string;
  referees: RefereeStatus[];
  onClose: () => void;
};

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function timeRange(entry: DayEntry) {
  if (entry.availableFrom && entry.availableTo) {
    return ` (${entry.availableFrom.slice(0, 5)}–${entry.availableTo.slice(0, 5)})`;
  }
  return "";
}

export function DayNominationModal({ dateStr, referees, onClose }: Props) {
  const available = referees.filter((r) => r.entry?.status === "available");
  const limited = referees.filter((r) => r.entry?.status === "limited");
  const unavailable = referees.filter((r) => r.entry?.status === "unavailable");
  const unfilled = referees.filter((r) => !r.entry);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
            {formatDateLabel(dateStr)}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            Zavrieť
          </button>
        </div>

        <section className="mt-4">
          <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
            Dostupní celý deň ({available.length})
          </h3>
          {available.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-400">nikto</p>
          ) : (
            <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {available.map((r) => (
                <li key={r.name} className="flex items-center text-sm text-zinc-700 dark:text-zinc-200">
                  {r.name}
                  <LicenseBadge level={r.license} />
                  {r.entry?.cancelRequested ? " (žiada zrušenie)" : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Obmedzene dostupní ({limited.length})
          </h3>
          {limited.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-400">nikto</p>
          ) : (
            <ul className="mt-1 space-y-1">
              {limited.map((r) => (
                <li key={r.name} className="text-sm text-zinc-700 dark:text-zinc-200">
                  <span className="inline-flex items-center">
                    {r.name}
                    <LicenseBadge level={r.license} />
                  </span>
                  {r.entry ? timeRange(r.entry) : ""}
                  {r.entry?.reason ? (
                    <span className="block text-xs text-zinc-500">
                      dôvod: {r.entry.reason}
                    </span>
                  ) : null}
                  {r.entry?.cancelRequested ? " (žiada zrušenie)" : ""}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
            Nedostupní ({unavailable.length})
          </h3>
          {unavailable.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-400">nikto</p>
          ) : (
            <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {unavailable.map((r) => (
                <li key={r.name} className="flex items-center text-sm text-zinc-700 dark:text-zinc-200">
                  {r.name}
                  <LicenseBadge level={r.license} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-semibold text-zinc-500">
            Nevyplnené ({unfilled.length})
          </h3>
          {unfilled.length === 0 ? (
            <p className="mt-1 text-sm text-zinc-400">nikto</p>
          ) : (
            <ul className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
              {unfilled.map((r) => (
                <li key={r.name} className="flex items-center text-sm text-zinc-500">
                  {r.name}
                  <LicenseBadge level={r.license} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
