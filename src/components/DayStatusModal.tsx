"use client";

import { useState } from "react";
import type { AvailabilityStatus } from "@/app/availability/actions";

const REASON_PRESETS = [
  "Hrám v ten deň zápas",
  "Zatiaľ neviem, či budem môcť",
];

const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  available: "Dostupný celý deň",
  limited: "Dostupný obmedzene",
  unavailable: "Nedostupný",
};

type Props = {
  dateStr: string;
  currentStatus: AvailabilityStatus | null;
  currentReason: string | null;
  currentAvailableFrom: string | null;
  currentAvailableTo: string | null;
  isLocked: boolean;
  cancelRequested: boolean;
  onSave: (
    status: AvailabilityStatus | null,
    reason: string | null,
    availableFrom: string | null,
    availableTo: string | null,
  ) => void;
  onRequestCancel: () => void;
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

export function DayStatusModal({
  dateStr,
  currentStatus,
  currentReason,
  currentAvailableFrom,
  currentAvailableTo,
  isLocked,
  cancelRequested,
  onSave,
  onRequestCancel,
  onClose,
}: Props) {
  const [pickingReason, setPickingReason] = useState(
    currentStatus === "limited",
  );
  const [reason, setReason] = useState(currentReason ?? "");
  const [availableFrom, setAvailableFrom] = useState(currentAvailableFrom ?? "");
  const [availableTo, setAvailableTo] = useState(currentAvailableTo ?? "");

  const showLockedView = currentStatus !== null && isLocked;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
          {formatDateLabel(dateStr)}
        </p>

        {showLockedView ? (
          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Tvoj stav: {STATUS_LABELS[currentStatus]}
              {currentReason ? ` — ${currentReason}` : ""}
              {currentAvailableFrom && currentAvailableTo
                ? ` (${currentAvailableFrom}–${currentAvailableTo})`
                : ""}
            </p>

            {cancelRequested ? (
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                Žiadosť o zrušenie čaká na schválenie administrátorom.
              </div>
            ) : (
              <>
                <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
                  Do termínu zostáva menej ako 5 dní, priama zmena už nie je
                  možná. Môžeš požiadať administrátora o zrušenie.
                </div>
                <button
                  type="button"
                  onClick={onRequestCancel}
                  className="mt-3 w-full rounded-lg bg-brand-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark"
                >
                  Požiadať o zrušenie
                </button>
              </>
            )}
          </div>
        ) : !pickingReason ? (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              onClick={() => onSave("available", null, null, null)}
              className="flex w-full items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-left text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
            >
              <span className="h-3 w-3 rounded-full bg-emerald-500" />
              Dostupný celý deň
            </button>

            <button
              type="button"
              onClick={() => setPickingReason(true)}
              className="flex w-full items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300"
            >
              <span className="h-3 w-3 rounded-full bg-amber-500" />
              Dostupný obmedzene
            </button>

            <button
              type="button"
              onClick={() => onSave("unavailable", null, null, null)}
              className="flex w-full items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-left text-sm font-medium text-red-800 transition hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
            >
              <span className="h-3 w-3 rounded-full bg-red-500" />
              Nedostupný
            </button>

            {currentStatus !== null && (
              <button
                type="button"
                onClick={() => onSave(null, null, null, null)}
                className="w-full rounded-lg px-4 py-2 text-center text-xs font-medium text-zinc-400 transition hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                Zrušiť vyplnenie
              </button>
            )}
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Z akého dôvodu?
            </p>

            <div className="mt-3 space-y-2">
              {REASON_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`w-full rounded-lg border px-4 py-2.5 text-left text-sm transition ${
                    reason === preset
                      ? "border-amber-400 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200"
                      : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                  }`}
                >
                  {preset}
                </button>
              ))}

              <textarea
                value={
                  REASON_PRESETS.includes(reason) ? "" : reason
                }
                onChange={(event) => setReason(event.target.value)}
                placeholder="Iný dôvod (voliteľné, vlastný text)"
                rows={2}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>

            <p className="mt-4 text-sm font-medium text-zinc-700 dark:text-zinc-200">
              Kedy počas dňa by si mohol/mohla pískať?
            </p>
            <p className="mt-1 text-xs text-zinc-500">Voliteľné.</p>

            <div className="mt-2 flex items-center gap-2">
              <input
                type="time"
                value={availableFrom}
                onChange={(event) => setAvailableFrom(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
              <span className="text-sm text-zinc-400">—</span>
              <input
                type="time"
                value={availableTo}
                onChange={(event) => setAvailableTo(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
              />
            </div>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPickingReason(false)}
                className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Späť
              </button>
              <button
                type="button"
                onClick={() =>
                  onSave(
                    "limited",
                    reason || null,
                    availableFrom || null,
                    availableTo || null,
                  )
                }
                className="flex-1 rounded-lg bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-600"
              >
                Uložiť
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
