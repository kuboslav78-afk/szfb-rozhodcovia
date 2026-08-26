"use client";

import { useState, useTransition } from "react";
import { REGIONS, CATEGORY_LABELS, type Region } from "@/lib/categories";
import { chooseHomeRegion } from "@/app/admin-users/actions";

export function HomeRegionPrompt() {
  const [selected, setSelected] = useState<Region | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function handleConfirm() {
    if (!selected) return;
    setError(null);
    setLoading(true);

    startTransition(async () => {
      try {
        await chooseHomeRegion(selected);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Nepodarilo sa uložiť región.",
        );
        setLoading(false);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
          Vitaj
        </p>
        <h1 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
          V ktorom regióne chceš pôsobiť?
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          Vyber si svoj domáci región. Toto rozhodnutie neskôr môže zmeniť už
          len administrátor.
        </p>

        <div className="mt-5 space-y-2">
          {REGIONS.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => setSelected(region)}
              className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition ${
                selected === region
                  ? "border-brand-indigo bg-brand-indigo/10 text-brand-indigo dark:text-white"
                  : "border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
              }`}
            >
              {CATEGORY_LABELS[region]}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selected || loading}
          className="mt-5 w-full rounded-lg bg-brand-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Ukladám…" : "Potvrdiť"}
        </button>
      </div>
    </div>
  );
}
