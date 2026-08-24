"use client";

import { useTransition } from "react";
import { resolveCancellationRequest } from "@/app/availability/actions";
import type { Category } from "@/lib/categories";

export type CancellationRequestItem = {
  refereeId: string;
  refereeName: string;
  date: string;
  category: Category;
  status: string;
  reason: string | null;
  availableFrom: string | null;
  availableTo: string | null;
};

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function CancellationRequests({
  items,
}: {
  items: CancellationRequestItem[];
}) {
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return null;
  }

  function handle(
    refereeId: string,
    date: string,
    category: Category,
    approve: boolean,
  ) {
    startTransition(async () => {
      await resolveCancellationRequest(refereeId, date, category, approve);
    });
  }

  return (
    <div className="mb-10 rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/40">
      <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        Žiadosti o zrušenie ({items.length})
      </h2>

      <ul className="mt-3 divide-y divide-amber-200 dark:divide-amber-900">
        {items.map((item) => (
          <li
            key={`${item.refereeId}-${item.date}`}
            className="flex items-center justify-between gap-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-100">
                {item.refereeName} · {formatDateLabel(item.date)}
              </p>
              <p className="text-xs text-zinc-500">
                pôvodný stav: {item.status}
                {item.reason ? ` — ${item.reason}` : ""}
                {item.availableFrom && item.availableTo
                  ? ` (${item.availableFrom.slice(0, 5)}–${item.availableTo.slice(0, 5)})`
                  : ""}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handle(item.refereeId, item.date, item.category, true)}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
              >
                Schváliť
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handle(item.refereeId, item.date, item.category, false)}
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Zamietnuť
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
