import Link from "next/link";
import { adjacentMonth, monthLabel, monthParam, type MonthKey } from "@/lib/dates";
import type { Category } from "@/lib/categories";

type Props = { monthKey: MonthKey; view?: string; category?: Category };

export function MonthNav({ monthKey, view, category }: Props) {
  const prev = monthParam(adjacentMonth(monthKey, -1));
  const next = monthParam(adjacentMonth(monthKey, 1));
  const viewQuery = view === "moje" ? "&view=moje" : "";
  const categoryQuery = category ? `&category=${category}` : "";

  return (
    <div className="flex items-center gap-3">
      <Link
        href={`/?month=${prev}${viewQuery}${categoryQuery}`}
        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        ←
      </Link>
      <span className="min-w-[9rem] text-center text-sm font-semibold capitalize text-zinc-800 dark:text-zinc-200">
        {monthLabel(monthKey)}
      </span>
      <Link
        href={`/?month=${next}${viewQuery}${categoryQuery}`}
        className="rounded-lg border border-zinc-300 px-2.5 py-1 text-sm text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        →
      </Link>
    </div>
  );
}
