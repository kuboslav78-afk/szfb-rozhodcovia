"use client";

import { useRef, useState } from "react";
import {
  generatePrikaznaPayout,
  previewPayouts,
  type PayoutPreviewRow,
} from "@/app/payouts/actions";

function currentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function PayoutGenerator() {
  const [collapsed, setCollapsed] = useState(true);
  const [month, setMonth] = useState(currentMonth);
  const [rows, setRows] = useState<PayoutPreviewRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const templateRef = useRef<HTMLInputElement>(null);

  async function handlePreview() {
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      setRows(await previewPayouts(month));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Náhľad sa nepodaril.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerate() {
    const file = templateRef.current?.files?.[0];
    if (!file) {
      setError("Najprv vyber súbor so šablónou výkazu.");
      return;
    }

    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const data = new FormData();
      data.set("month", month);
      data.set("template", file);

      const result = await generatePrikaznaPayout(data);

      // Server action vracia base64 — v prehliadači z toho spravíme stiahnutie.
      const bytes = Uint8Array.from(atob(result.base64), (c) => c.charCodeAt(0));
      const url = URL.createObjectURL(
        new Blob([bytes], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      link.click();
      URL.revokeObjectURL(url);

      setDone(
        `Vygenerované pre ${result.refereeCount} rozhodcov, spolu ${result.total.toFixed(2)} €.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generovanie zlyhalo.");
    } finally {
      setBusy(false);
    }
  }

  if (collapsed) {
    return (
      <div className="mb-10 flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Výplatné podklady
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Vyplní tvoju šablónu výkazu činnosti k rámcovej príkaznej zmluve za vybraný
            mesiac — vrátane hromadného príkazu.
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

  const totalSum = rows?.reduce((s, r) => s + r.total, 0) ?? 0;
  const withProblems = rows?.filter((r) => r.missing.length > 0) ?? [];

  return (
    <div className="mb-10 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Výplatné podklady — rámcová príkazná zmluva
          </h2>
          <p className="mt-1 max-w-3xl text-xs text-zinc-500">
            Berú sa <span className="font-semibold">potvrdené</span> nominácie za vybraný
            mesiac. Šablónu nahrávaš pri každom generovaní a nikam sa neukladá, takže sa
            vždy použije tá verzia, ktorú máš práve platnú, aj s tvojím formátovaním.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="shrink-0 rounded-lg bg-brand-indigo px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark"
        >
          Zavrieť
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">Mesiac</span>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          />
        </label>

        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-medium text-zinc-500">Šablóna výkazu (.xlsx)</span>
          <input
            ref={templateRef}
            type="file"
            accept=".xlsx"
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-1.5 file:text-sm file:font-medium dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:file:bg-zinc-800 dark:file:text-zinc-200"
          />
        </label>

        <button
          type="button"
          disabled={busy}
          onClick={handlePreview}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Náhľad
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={handleGenerate}
          className="rounded-lg bg-brand-indigo px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:opacity-60"
        >
          {busy ? "Pracujem…" : "Vygenerovať"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}
      {done && (
        <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{done}</p>
      )}

      {rows && (
        <div className="mt-4">
          {rows.length === 0 ? (
            <p className="py-4 text-sm text-zinc-400">
              Za tento mesiac nemá žiadny rozhodca s rámcovou príkaznou zmluvou potvrdenú
              nomináciu.
            </p>
          ) : (
            <>
              {withProblems.length > 0 && (
                <p className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  <span className="font-semibold">
                    {withProblems.length === 1
                      ? "1 rozhodcovi chýbajú údaje"
                      : `${withProblems.length} rozhodcom chýbajú údaje`}
                  </span>{" "}
                  — vo výkaze zostanú tie políčka prázdne.
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm whitespace-nowrap">
                  <thead>
                    <tr className="bg-zinc-50 dark:bg-zinc-900">
                      <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-500">
                        Rozhodca
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-500">
                        Č. zmluvy
                      </th>
                      <th className="px-2 py-2 text-right text-xs font-semibold text-zinc-500">
                        Zápasov
                      </th>
                      <th className="px-2 py-2 text-right text-xs font-semibold text-zinc-500">
                        Spolu
                      </th>
                      <th className="px-2 py-2 text-left text-xs font-semibold text-zinc-500">
                        Chýba
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.fullName}
                        className="border-t border-zinc-100 dark:border-zinc-900"
                      >
                        <td className="px-2 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                          {r.fullName}
                        </td>
                        <td className="px-2 py-2 text-zinc-600 dark:text-zinc-300">
                          {r.contractNumber ?? (
                            <span className="text-zinc-300 dark:text-zinc-700">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right text-zinc-600 dark:text-zinc-300">
                          {r.matchCount}
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-zinc-800 dark:text-zinc-200">
                          {r.total.toFixed(2)} €
                        </td>
                        <td className="px-2 py-2 text-xs text-amber-700 dark:text-amber-500">
                          {r.missing.join(", ")}
                        </td>
                      </tr>
                    ))}
                    <tr className="border-t-2 border-zinc-300 dark:border-zinc-700">
                      <td
                        className="px-2 py-2 text-xs font-semibold text-zinc-500"
                        colSpan={3}
                      >
                        Spolu {rows.length} rozhodcov
                      </td>
                      <td className="px-2 py-2 text-right font-bold text-zinc-900 dark:text-zinc-100">
                        {totalSum.toFixed(2)} €
                      </td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
