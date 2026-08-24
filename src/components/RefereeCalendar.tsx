"use client";

import { useState, useTransition } from "react";
import {
  type MonthKey,
  daysUntil,
  monthGrid,
  toDateStr,
  weekdayLabels,
} from "@/lib/dates";
import {
  requestCancellation,
  setAvailability,
  type AvailabilityStatus,
} from "@/app/availability/actions";
import { DayStatusModal } from "@/components/DayStatusModal";
import type { Category } from "@/lib/categories";

const LOCK_THRESHOLD_DAYS = 5;

type DayEntry = {
  status: AvailabilityStatus;
  reason: string | null;
  availableFrom: string | null;
  availableTo: string | null;
  cancelRequested: boolean;
};

type Props = {
  monthKey: MonthKey;
  category: Category;
  matchDays: string[];
  initialAvailability: Record<string, DayEntry>;
  todayDateStr: string;
};

function cellClasses(status: AvailabilityStatus | null, isToday: boolean) {
  const base =
    "relative flex h-16 w-full flex-col items-center justify-center rounded-lg text-sm font-medium transition disabled:cursor-default";

  const ring = isToday ? "ring-2 ring-offset-2 ring-zinc-400 dark:ring-offset-black" : "";

  if (status === "available") {
    return `${base} ${ring} bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60`;
  }
  if (status === "limited") {
    return `${base} ${ring} bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:hover:bg-amber-900/60`;
  }
  if (status === "unavailable") {
    return `${base} ${ring} bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60`;
  }
  return `${base} ${ring} bg-zinc-100 text-zinc-500 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-500 dark:hover:bg-zinc-800`;
}

export function RefereeCalendar({
  monthKey,
  category,
  matchDays,
  initialAvailability,
  todayDateStr: today,
}: Props) {
  const [availability, setAvailabilityState] = useState(initialAvailability);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const matchDaySet = new Set(matchDays);
  const cells = monthGrid(monthKey);

  function handleSave(
    status: AvailabilityStatus | null,
    reason: string | null,
    availableFrom: string | null,
    availableTo: string | null,
  ) {
    if (!selectedDate) return;
    const dateStr = selectedDate;

    setAvailabilityState((prev) => {
      const copy = { ...prev };
      if (status === null) {
        delete copy[dateStr];
      } else {
        copy[dateStr] = {
          status,
          reason,
          availableFrom,
          availableTo,
          cancelRequested: false,
        };
      }
      return copy;
    });

    setSelectedDate(null);

    startTransition(async () => {
      await setAvailability(
        dateStr,
        category,
        status,
        reason,
        availableFrom,
        availableTo,
      );
    });
  }

  function handleRequestCancel() {
    if (!selectedDate) return;
    const dateStr = selectedDate;

    setAvailabilityState((prev) => {
      const entry = prev[dateStr];
      if (!entry) return prev;
      return { ...prev, [dateStr]: { ...entry, cancelRequested: true } };
    });

    setSelectedDate(null);

    startTransition(async () => {
      await requestCancellation(dateStr, category);
    });
  }

  if (matchDaySet.size === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Admin zatiaľ nezadal žiadne hracie dni pre tento mesiac.
      </p>
    );
  }

  const selectedEntry = selectedDate ? availability[selectedDate] : undefined;
  const selectedIsLocked = selectedDate
    ? daysUntil(selectedDate) < LOCK_THRESHOLD_DAYS
    : false;

  return (
    <div>
      <div className="mb-2 grid grid-cols-7 gap-2 text-center text-xs font-semibold text-zinc-400">
        {weekdayLabels().map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} />;
          }

          const dateStr = toDateStr(monthKey.year, monthKey.month, day);
          const isMatchDay = matchDaySet.has(dateStr);

          if (!isMatchDay) {
            return (
              <div
                key={dateStr}
                className="flex h-16 w-full items-center justify-center rounded-lg text-sm text-zinc-300 dark:text-zinc-800"
              >
                {day}
              </div>
            );
          }

          const entry = availability[dateStr];
          const locked = Boolean(entry) && daysUntil(dateStr) < LOCK_THRESHOLD_DAYS;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => setSelectedDate(dateStr)}
              className={cellClasses(entry?.status ?? null, dateStr === today)}
            >
              <span>{day}</span>
              {entry?.status === "limited" &&
                entry.availableFrom &&
                entry.availableTo && (
                  <span className="text-[10px] font-normal leading-none opacity-80">
                    {entry.availableFrom.slice(0, 5)}–{entry.availableTo.slice(0, 5)}
                  </span>
                )}
              {entry?.cancelRequested && (
                <span className="absolute right-1 top-1 text-[10px]" title="Žiadosť o zrušenie čaká na schválenie">
                  ⏳
                </span>
              )}
              {!entry?.cancelRequested && locked && (
                <span className="absolute right-1 top-1 text-[10px]" title="Zamknuté (menej ako 5 dní do termínu)">
                  🔒
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-wrap gap-4 text-xs text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-200 dark:bg-emerald-900/60" />
          Dostupný celý deň
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-amber-200 dark:bg-amber-900/60" />
          Obmedzene
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-red-200 dark:bg-red-900/60" />
          Nedostupný
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-zinc-200 dark:bg-zinc-800" />
          Nevyplnené
        </span>
        <span>🔒 zamknuté · ⏳ žiadosť o zrušenie</span>
        <span className="ml-auto">Klikni na hrací deň pre zmenu stavu.</span>
      </div>

      {selectedDate && (
        <DayStatusModal
          dateStr={selectedDate}
          currentStatus={selectedEntry?.status ?? null}
          currentReason={selectedEntry?.reason ?? null}
          currentAvailableFrom={selectedEntry?.availableFrom ?? null}
          currentAvailableTo={selectedEntry?.availableTo ?? null}
          isLocked={selectedIsLocked}
          cancelRequested={selectedEntry?.cancelRequested ?? false}
          onSave={handleSave}
          onRequestCancel={handleRequestCancel}
          onClose={() => setSelectedDate(null)}
        />
      )}
    </div>
  );
}
