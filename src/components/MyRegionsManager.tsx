"use client";

import { useState, useTransition } from "react";
import { CATEGORY_LABELS, REGIONS, type Category } from "@/lib/categories";
import { setMyRegion } from "@/app/referee-categories/actions";

type Props = {
  myCategories: Category[];
};

export function MyRegionsManager({ myCategories }: Props) {
  const initialRegions = myCategories.filter((c) => c !== "celostatny");
  const [selected, setSelected] = useState<Set<Category>>(
    () => new Set(initialRegions),
  );
  const [collapsed, setCollapsed] = useState(initialRegions.length > 0);
  const isNational = myCategories.includes("celostatny");
  const [isPending, startTransition] = useTransition();

  function toggle(region: Category) {
    const next = !selected.has(region);

    setSelected((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(region);
      else copy.delete(region);
      return copy;
    });

    startTransition(async () => {
      await setMyRegion(region, next);
    });
  }

  if (collapsed) {
    const summary = Array.from(selected)
      .map((r) => CATEGORY_LABELS[r])
      .join(", ");

    return (
      <div className="mb-10 flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Moje regióny
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {isNational && "Celoštátny"}
            {isNational && summary ? " · " : ""}
            {summary || (!isNational ? "Zatiaľ nevybraté" : "")}
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
            Moje regióny
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Vyber región(y), v ktorých chceš ponúknuť svoju dostupnosť. Väčšinou
            stačí jeden, výnimočne môžeš pridať aj ďalší.
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

      <div className="mt-3 flex flex-wrap gap-2">
        {isNational && (
          <span className="rounded-full bg-brand-indigo px-3 py-1.5 text-sm font-medium text-white">
            Celoštátny (pridelil admin)
          </span>
        )}
        {REGIONS.map((region) => (
          <button
            key={region}
            type="button"
            disabled={isPending}
            onClick={() => toggle(region)}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition disabled:opacity-60 ${
              selected.has(region)
                ? "border-brand-indigo bg-brand-indigo/10 text-brand-indigo dark:text-white"
                : "border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            }`}
          >
            {CATEGORY_LABELS[region]}
          </button>
        ))}
      </div>
    </div>
  );
}
