"use client";

import { useMemo, useState } from "react";
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

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
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
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return referees;
    return referees.filter((r) => normalize(r.name).includes(q));
  }, [referees, query]);

  const available = filtered.filter((r) => r.entry?.status === "available");
  const limited = filtered.filter((r) => r.entry?.status === "limited");
  const unavailable = filtered.filter((r) => r.entry?.status === "unavailable");
  const unfilled = filtered.filter((r) => !r.entry);

  const groups = [
    { key: "available", label: "Dostupní celý deň", items: available, className: "text-emerald-700 dark:text-emerald-400" },
    { key: "limited", label: "Obmedzene dostupní", items: limited, className: "text-amber-700 dark:text-amber-400" },
    { key: "unavailable", label: "Nedostupní", items: unavailable, className: "text-red-700 dark:text-red-400" },
    { key: "unfilled", label: "Nevyplnené", items: unfilled, className: "text-zinc-500" },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="shrink-0 p-6 pb-0">
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

          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Hľadať podľa mena…"
            autoFocus
            className="mt-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div className="overflow-y-auto p-6 pt-4">
          {filtered.length === 0 && (
            <p className="py-6 text-center text-sm text-zinc-400">Nikto sa nenašiel.</p>
          )}

          {groups.map(
            (group) =>
              group.items.length > 0 && (
                <section key={group.key} className="mt-4 first:mt-0">
                  <h3 className={`text-sm font-semibold ${group.className}`}>
                    {group.label} ({group.items.length})
                  </h3>
                  <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                    {group.items.map((r) => (
                      <RefereeButton key={r.id} referee={r} onPick={onPick} />
                    ))}
                  </div>
                </section>
              ),
          )}
        </div>
      </div>
    </div>
  );
}
