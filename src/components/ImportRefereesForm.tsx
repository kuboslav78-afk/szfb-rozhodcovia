"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { createRefereesBulk, type BulkImportResult } from "@/app/admin-users/actions";
import { guessLicenseFromLabel, LICENSE_LABELS, type LicenseLevel } from "@/lib/licenses";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/categories";

type ParsedRow = {
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  license: LicenseLevel | null;
  licenseRaw: string;
  valid: boolean;
};

function normalizeHeader(header: string) {
  return header
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function findKey(headers: string[], candidates: (h: string) => boolean) {
  return headers.find(candidates);
}

function parseWorkbook(buffer: ArrayBuffer): { rows: ParsedRow[]; unrecognized: boolean } {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { rows: [], unrecognized: true };

  const sheet = workbook.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  if (raw.length === 0) return { rows: [], unrecognized: true };

  const originalHeaders = Object.keys(raw[0]);
  const normalizedMap = new Map(originalHeaders.map((h) => [h, normalizeHeader(h)]));

  const nameKey = findKey(originalHeaders, (h) => normalizedMap.get(h)!.includes("meno"));
  const emailKey = findKey(originalHeaders, (h) => normalizedMap.get(h)!.includes("mail"));
  const phoneKey = findKey(originalHeaders, (h) => normalizedMap.get(h)!.includes("telef"));
  const addressKey = findKey(originalHeaders, (h) => normalizedMap.get(h)!.includes("adres"));
  const licenseKey = findKey(originalHeaders, (h) => normalizedMap.get(h)!.includes("licenc"));

  if (!nameKey || !emailKey) {
    return { rows: [], unrecognized: true };
  }

  const rows: ParsedRow[] = raw.map((record) => {
    const fullName = String(record[nameKey] ?? "").trim();
    const email = String(record[emailKey] ?? "").trim().toLowerCase();
    const phone = phoneKey ? String(record[phoneKey] ?? "").trim() || null : null;
    const address = addressKey ? String(record[addressKey] ?? "").trim() || null : null;
    const licenseRaw = licenseKey ? String(record[licenseKey] ?? "").trim() : "";
    const license = licenseRaw ? guessLicenseFromLabel(licenseRaw) : null;

    return {
      fullName,
      email,
      phone,
      address,
      license,
      licenseRaw,
      valid: Boolean(fullName) && email.includes("@"),
    };
  });

  return { rows: rows.filter((r) => r.fullName || r.email), unrecognized: false };
}

export function ImportRefereesForm() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [category, setCategory] = useState<Category | "">("");
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<BulkImportResult[] | null>(null);

  function reset() {
    setRows([]);
    setParseError(null);
    setCategory("");
    setResults(null);
  }

  async function handleFile(file: File) {
    setParseError(null);
    setResults(null);
    try {
      const buffer = await file.arrayBuffer();
      const { rows: parsed, unrecognized } = parseWorkbook(buffer);
      if (unrecognized) {
        setParseError(
          "Nepodarilo sa rozpoznať stĺpce. Tabuľka musí mať hlavičkový riadok so stĺpcami aspoň pre meno a e-mail (napr. \"Meno a priezvisko\", \"E-mail\").",
        );
        setRows([]);
        return;
      }
      setRows(parsed);
    } catch {
      setParseError("Súbor sa nepodarilo prečítať — over, že ide o platný .xlsx alebo .csv súbor.");
      setRows([]);
    }
  }

  const validRows = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);

  async function handleImport() {
    setImporting(true);
    try {
      const imported = await createRefereesBulk(
        validRows.map((r) => ({
          fullName: r.fullName,
          email: r.email,
          phone: r.phone,
          address: r.address,
          license: r.license,
        })),
        category || null,
      );
      setResults(imported);
      setRows([]);
    } finally {
      setImporting(false);
    }
  }

  if (!open) {
    return (
      <div className="mb-10">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Importovať z Excelu
        </button>
      </div>
    );
  }

  return (
    <div className="mb-10 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">Import rozhodcov z Excelu</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Nahraj .xlsx alebo .csv s hlavičkovým riadkom (meno, e-mail, telefón, adresa, licencia).
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="shrink-0 text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          Zavrieť
        </button>
      </div>

      {results ? (
        <div className="mt-4">
          <p className="text-sm text-zinc-600 dark:text-zinc-300">
            Vytvorených: {results.filter((r) => r.success).length} / {results.length}
          </p>
          <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-sm">
              <tbody>
                {results.map((r, i) => (
                  <tr key={i} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
                    <td className="px-3 py-2">{r.fullName}</td>
                    <td className="px-3 py-2 text-zinc-500">{r.email}</td>
                    <td className="px-3 py-2">
                      {r.success ? (
                        <span className="text-emerald-600 dark:text-emerald-400">
                          heslo: <span className="font-mono">{r.password}</span>
                        </span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">{r.error}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={reset}
            className="mt-3 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            Importovať ďalší súbor
          </button>
        </div>
      ) : (
        <>
          <div className="mt-4">
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-brand-indigo file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white dark:text-zinc-300"
            />
          </div>

          {parseError && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {parseError}
            </div>
          )}

          {rows.length > 0 && (
            <div className="mt-4">
              <div className="mb-3">
                <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
                  Kategória pre všetkých importovaných (voliteľné)
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category | "")}
                  className="w-full max-w-xs rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
                >
                  <option value="">— nevybraté, sami si zvolia domáci región —</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Rozpoznaných {validRows.length} platných riadkov
                {invalidRows.length > 0 ? `, ${invalidRows.length} preskočených (chýba meno alebo e-mail)` : ""}.
              </p>

              <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50 text-left text-xs text-zinc-500 dark:bg-zinc-900">
                    <tr>
                      <th className="px-3 py-2">Meno</th>
                      <th className="px-3 py-2">E-mail</th>
                      <th className="px-3 py-2">Telefón</th>
                      <th className="px-3 py-2">Adresa</th>
                      <th className="px-3 py-2">Licencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr
                        key={i}
                        className={`border-t border-zinc-100 dark:border-zinc-800 ${!r.valid ? "opacity-40" : ""}`}
                      >
                        <td className="px-3 py-2">{r.fullName || "—"}</td>
                        <td className="px-3 py-2 text-zinc-500">{r.email || "—"}</td>
                        <td className="px-3 py-2 text-zinc-500">{r.phone ?? "—"}</td>
                        <td className="px-3 py-2 text-zinc-500">{r.address ?? "—"}</td>
                        <td className="px-3 py-2 text-zinc-500">
                          {r.license ? LICENSE_LABELS[r.license] : r.licenseRaw || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                disabled={importing || validRows.length === 0}
                onClick={handleImport}
                className="mt-4 rounded-lg bg-brand-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importing ? "Importujem…" : `Importovať ${validRows.length} rozhodcov`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
