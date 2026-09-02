"use client";

import type { AvailabilityStatus } from "@/app/availability/actions";
import type { LicenseLevel } from "@/lib/licenses";
import { LicenseBadge } from "@/components/LicenseBadge";

type DayEntry = {
  status: AvailabilityStatus;
  reason: string | null;
  availableFrom: string | null;
  availableTo: string | null;
};

export type PickerReferee = {
  id: string;
  name: string;
  license: LicenseLevel | null;
  entry: DayEntry | undefined;
};

type Props = {
  dateStr: string;
  referees: PickerReferee[];
  onPick: (refereeId: string) => void;
  onClose: () => void;
};

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("sk-SK", { weekday: "long", day: "numeric", month: "long" });
}

function timeRange(entry: DayEntry) {
  if (entry.availableFrom && entry.availableTo) {
    return ` (${entry.availableFrom.slice(0, 5)}–${entry.availableTo.slice(0, 5)})`;
  }
  return "";
}

function RefereeButton({
  referee,
  onPick,
}: {
  referee: PickerReferee;
  onPick: (refereeId: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(referee.id)}
      className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm text-zinc-700 transition hover:border-brand-indigo hover:bg-brand-indigo/5 dark:border-zinc-800 dark:text-zinc-200 dark:hover:border-brand-indigo"
    >
      <span className="flex items-center">
        {referee.name}
        <LicenseBadge level={referee.license} />
      </span>
      {referee.entry?.reason && (
        <span className="ml-2 text-xs text-zinc-400">
          {referee.entry.reason}
          {timeRange(referee.entry)}
        </span>
      )}
    </button>
  );
}

export function RefereePickerModal({ dateStr, referees, onPick, onClose }: Props) {
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
            {formatDateLabel(dateStr)} — vyber rozhodcu
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
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {available.map((r) => (
              <RefereeButton key={r.id} referee={r} onPick={onPick} />
            ))}
          </div>
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-semibold text-amber-700 dark:text-amber-400">
            Obmedzene dostupní ({limited.length})
          </h3>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {limited.map((r) => (
              <RefereeButton key={r.id} referee={r} onPick={onPick} />
            ))}
          </div>
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">
            Nedostupní ({unavailable.length})
          </h3>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {unavailable.map((r) => (
              <RefereeButton key={r.id} referee={r} onPick={onPick} />
            ))}
          </div>
        </section>

        <section className="mt-4">
          <h3 className="text-sm font-semibold text-zinc-500">Nevyplnené ({unfilled.length})</h3>
          <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
            {unfilled.map((r) => (
              <RefereeButton key={r.id} referee={r} onPick={onPick} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
