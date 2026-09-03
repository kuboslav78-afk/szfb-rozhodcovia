"use client";

import { useState } from "react";
import { findMatchesByNumber, manualUpdateMatch, type FoundMatch } from "@/app/nominations/actions";
import { CATEGORY_LABELS, type Category } from "@/lib/categories";

export function ManualMatchUpdate() {
  const [collapsed, setCollapsed] = useState(true);
  const [matchNumberInput, setMatchNumberInput] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [found, setFound] = useState<FoundMatch[] | null>(null);
  const [selected, setSelected] = useState<FoundMatch | null>(null);

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [venue, setVenue] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function reset() {
    setFound(null);
    setSelected(null);
    setSaved(false);
    setSaveError(null);
  }

  async function handleSearch() {
    const num = Number(matchNumberInput.trim());
    if (!Number.isFinite(num) || num <= 0) {
      setSearchError("Zadaj platné číslo zápasu.");
      return;
    }
    setSearchError(null);
    setSearching(true);
    reset();

    try {
      const results = await findMatchesByNumber(num);
      if (results.length === 0) {
        setSearchError("Zápas s týmto číslom sa v systéme nenašiel.");
      } else {
        setFound(results);
        if (results.length === 1) {
          selectMatch(results[0]);
        }
      }
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : "Nepodarilo sa vyhľadať.");
    } finally {
      setSearching(false);
    }
  }

  function selectMatch(match: FoundMatch) {
    setSelected(match);
    setDate(match.match_date);
    setTime(match.match_time ? match.match_time.slice(0, 5) : "");
    setVenue(match.venue ?? "");
    setSaved(false);
    setSaveError(null);
  }

  async function handleSave() {
    if (!selected) return;
    setSaving(true);
    setSaveError(null);

    try {
      await manualUpdateMatch(selected.id, {
        matchDate: date,
        matchTime: time ? `${time}:00` : null,
        venue: venue.trim() || null,
      });
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Uloženie zlyhalo.");
    } finally {
      setSaving(false);
    }
  }

  if (collapsed) {
    return (
      <div className="mb-6 flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Ručná úprava zápasu</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Pre zmeny hlásené v ISF ešte pred prejavením na verejnom webe szfb.sk.
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
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Ručná úprava zápasu</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Pre zmeny hlásené v ISF ešte pred prejavením na verejnom webe szfb.sk.
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

      <div className="mt-4 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={matchNumberInput}
          onChange={(e) => setMatchNumberInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Číslo zápasu (Č.z.)"
          className="w-48 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        />
        <button
          type="button"
          disabled={searching}
          onClick={handleSearch}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {searching ? "Hľadám…" : "Nájsť"}
        </button>
      </div>

      {searchError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{searchError}</p>}

      {found && found.length > 1 && !selected && (
        <div className="mt-4 space-y-1.5">
          <p className="text-xs text-zinc-500">Našlo sa viac zápasov s týmto číslom — vyber ten správny:</p>
          {found.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => selectMatch(m)}
              className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-left text-sm transition hover:border-brand-indigo dark:border-zinc-700"
            >
              <span>
                {m.team_home} vs {m.team_away}
              </span>
              <span className="text-xs text-zinc-400">
                {m.league} · {CATEGORY_LABELS[m.category as Category] ?? m.category}
              </span>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="mt-4 rounded-lg border border-zinc-100 p-4 dark:border-zinc-900">
          <p className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-100">
            {selected.team_home} vs {selected.team_away}
            <span className="ml-2 text-xs font-normal text-zinc-400">
              Č.z. {selected.match_number} · {selected.league}
            </span>
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Dátum</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Čas</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">Hala</label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="napr. Predator Aréna Sabinov"
                className="w-full rounded-lg border border-zinc-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
              />
            </div>
          </div>

          {saveError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{saveError}</p>}
          {saved && (
            <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
              Uložené. Ak už mal rozhodca potvrdené, vrátilo sa mu to na opätovné potvrdenie.
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="rounded-lg bg-brand-indigo px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:opacity-60"
            >
              {saving ? "Ukladám…" : "Uložiť zmenu"}
            </button>
            <button
              type="button"
              onClick={() => {
                setSelected(null);
                setFound(null);
                setMatchNumberInput("");
              }}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Zrušiť
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
