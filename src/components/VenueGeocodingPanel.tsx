"use client";

import { useState } from "react";
import { listVenuesWithoutCoordinates, geocodeVenues } from "@/app/nominations/actions";

export function VenueGeocodingPanel() {
  const [collapsed, setCollapsed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [venues, setVenues] = useState<string[] | null>(null);
  const [cities, setCities] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleOpen() {
    setCollapsed(false);
    setLoading(true);
    setError(null);
    try {
      const list = await listVenuesWithoutCoordinates();
      setVenues(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodarilo sa načítať zoznam hál.");
    } finally {
      setLoading(false);
    }
  }

  async function handleRun() {
    if (!venues) return;
    const entries = venues.map((venue) => ({ venue, city: cities[venue] ?? "" })).filter((e) => e.city.trim());
    if (entries.length === 0) {
      setError("Vyplň aspoň jedno mesto.");
      return;
    }

    setRunning(true);
    setError(null);
    let totalGeocoded = 0;
    let totalFailed = 0;
    let remaining = [...entries];

    try {
      while (remaining.length > 0) {
        const batch = remaining.slice(0, 8);
        const result = await geocodeVenues(batch);
        totalGeocoded += result.geocoded;
        totalFailed += result.failed;
        remaining = remaining.slice(result.processed);
        setStatus(`Spracovaných ${totalGeocoded + totalFailed} / ${entries.length}…`);

        if (result.processed === 0) {
          const detail = result.failureSamples?.length ? ` Príčina: ${result.failureSamples.join(" | ")}` : "";
          throw new Error(`Geokódovanie sa zastavilo.${detail}`);
        }
      }

      const list = await listVenuesWithoutCoordinates();
      setVenues(list);
      setCities({});
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
          onClick={handleOpen}
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
            miest — nestihnú. Plné názvy hál sa geokódovať nedajú spoľahlivo, stačí napísať mesto/obec ku každej.
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

      {loading && <p className="mt-4 text-sm text-zinc-400">Načítavam haly…</p>}

      {venues && venues.length === 0 && !loading && (
        <p className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">
          Všetky haly už majú priradené mesto. ✓
        </p>
      )}

      {venues && venues.length > 0 && (
        <>
          <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
            {venues.map((venue) => (
              <div key={venue} className="flex items-center gap-3">
                <span className="flex-1 truncate text-sm text-zinc-600 dark:text-zinc-300" title={venue}>
                  {venue}
                </span>
                <input
                  type="text"
                  value={cities[venue] ?? ""}
                  onChange={(e) => setCities((prev) => ({ ...prev, [venue]: e.target.value }))}
                  placeholder="Mesto/obec"
                  className="w-48 shrink-0 rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={running}
            onClick={handleRun}
            className="mt-4 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            {running ? "Geokóduje sa…" : "Geokódovať vyplnené"}
          </button>
        </>
      )}

      {status && <p className="mt-2 text-sm text-zinc-500">{status}</p>}
      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
