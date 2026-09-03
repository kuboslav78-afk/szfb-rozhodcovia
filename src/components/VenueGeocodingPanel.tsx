"use client";

import { useState } from "react";
import { geocodeVenues } from "@/app/nominations/actions";

export function VenueGeocodingPanel() {
  const [collapsed, setCollapsed] = useState(true);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleRun() {
    setRunning(true);
    setError(null);
    let totalGeocoded = 0;
    let totalFailed = 0;

    try {
      while (true) {
        const result = await geocodeVenues();
        totalGeocoded += result.geocoded;
        totalFailed += result.failed;
        setStatus(
          `Spracovaných ${totalGeocoded + totalFailed} / ${result.totalVenues} hál — zostáva ${result.remaining}…`,
        );
        if (result.processed === 0 || result.remaining === 0) break;
      }
      setStatus(`Hotovo — geokódovaných ${totalGeocoded}, nenájdených ${totalFailed}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Geokódovanie zlyhalo.");
    } finally {
      setRunning(false);
    }
  }

  if (collapsed) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Vzdialenosti hál</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Potrebné na ochranu proti dvojitej nominácii rozhodcu v ten istý deň.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Otvoriť
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Vzdialenosti hál</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Pri výbere rozhodcu do zápasu systém skryje tých, ktorí ten deň už majú zápas, ktorý — podľa vzdialenosti
            hál — nestihnú. Nové haly (napr. po importe) treba raz zaradiť tlačidlom nižšie.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="shrink-0 rounded-lg bg-brand-indigo px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark"
        >
          Hotovo
        </button>
      </div>

      <button
        type="button"
        disabled={running}
        onClick={handleRun}
        className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
      >
        {running ? "Geokóduje sa…" : "Zaradiť nové haly"}
      </button>

      {status && <p className="mt-2 text-sm text-zinc-500">{status}</p>}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
