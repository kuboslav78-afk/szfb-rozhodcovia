"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { CATEGORY_LABELS, type Category } from "@/lib/categories";
import type { LicenseLevel } from "@/lib/licenses";
import { CONTRACT_LABELS, type ContractType } from "@/lib/contracts";
import { PROFILE_FIELDS, filledProfileFieldCount } from "@/lib/profile-completeness";

export type RefereeDataRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  date_of_birth: string | null;
  birth_number: string | null;
  bank_account: string | null;
  jersey_size: string | null;
  shorts_size: string | null;
  socks_size: string | null;
  license_level: LicenseLevel | null;
  home_region: Category | null;
  photo_path: string | null;
  criminal_record_uploaded_at: string | null;
  contract_type: ContractType | null;
  contract_number: string | null;
};

type Props = {
  referees: RefereeDataRow[];
  categories: Record<string, Category[]>;
};

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function formatDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("sk-SK", { day: "numeric", month: "numeric", year: "numeric" });
}

function filledCount(referee: RefereeDataRow) {
  return filledProfileFieldCount(referee);
}

/** Prázdna hodnota nech je v tabuľke jasne odlíšená od vyplnenej. */
function Cell({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-zinc-300 dark:text-zinc-700">—</span>;
  return <>{value}</>;
}

/** Hlavičky exportu — poradie určuje poradie stĺpcov v hárku. */
function exportRow(referee: RefereeDataRow, refereeCategories: Category[]) {
  return {
    Meno: referee.full_name,
    "E-mail": referee.email,
    "Telefón": referee.phone ?? "",
    Adresa: referee.address ?? "",
    "Dátum narodenia": referee.date_of_birth ?? "",
    "Rodné číslo": referee.birth_number ?? "",
    IBAN: referee.bank_account ?? "",
    Dres: referee.jersey_size ?? "",
    Trenky: referee.shorts_size ?? "",
    "Ponožky": referee.socks_size ?? "",
    Zmluva: referee.contract_type ? CONTRACT_LABELS[referee.contract_type] : "",
    "Číslo zmluvy": referee.contract_number ?? "",
    Licencia: referee.license_level ?? "",
    "Domáci región": referee.home_region ? CATEGORY_LABELS[referee.home_region] : "",
    "Kategórie": refereeCategories.map((c) => CATEGORY_LABELS[c]).join(", "),
    "Výpis RT nahratý": referee.criminal_record_uploaded_at
      ? referee.criminal_record_uploaded_at.slice(0, 10)
      : "",
    Fotka: referee.photo_path ? "áno" : "",
    "Vyplnené": `${filledCount(referee)}/${PROFILE_FIELDS.length}`,
  };
}

export function RefereeDataTable({ referees, categories }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const [search, setSearch] = useState("");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);

  // Exportuje presne to, čo je práve v tabuľke — vrátane filtrov, nech sa dá
  // vytiahnuť napr. len zoznam tých, ktorým ešte chýbajú údaje do zmluvy.
  function handleExport(rows: RefereeDataRow[]) {
    const sheet = XLSX.utils.json_to_sheet(
      rows.map((r) => exportRow(r, categories[r.id] ?? [])),
    );
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Rozhodcovia");

    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(book, `rozhodcovia-udaje-${today}.xlsx`);
  }

  const query = normalize(search);
  const visible = referees.filter((referee) => {
    if (onlyIncomplete && filledCount(referee) === PROFILE_FIELDS.length) return false;
    if (!query) return true;
    return (
      normalize(referee.full_name).includes(query) ||
      normalize(referee.email).includes(query)
    );
  });

  if (collapsed) {
    return (
      <div className="mb-10 flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Údaje rozhodcov
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Všetko, čo si rozhodcovia vyplnili v profile — kontakt, údaje do zmluvy,
            veľkosti výstroja a výpis z registra trestov, pokope v jednej tabuľke.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Zobraziť
        </button>
      </div>
    );
  }

  return (
    <div className="mb-10 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Údaje rozhodcov
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Rodné číslo a IBAN sú tu kvôli rámcovej príkaznej zmluve a výplatám —
            tabuľku vidí len Super Admin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="shrink-0 rounded-lg bg-brand-indigo px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark"
        >
          Skryť
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Hľadať podľa mena alebo e-mailu…"
          className="min-w-[220px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        />
        <label className="flex items-center gap-1.5 text-sm text-zinc-600 dark:text-zinc-300">
          <input
            type="checkbox"
            checked={onlyIncomplete}
            onChange={(e) => setOnlyIncomplete(e.target.checked)}
            className="rounded border-zinc-300 accent-brand-indigo dark:border-zinc-700"
          />
          Len nekompletné
        </label>
        <span className="text-xs text-zinc-400">
          {visible.length} z {referees.length}
        </span>
        <button
          type="button"
          disabled={visible.length === 0}
          onClick={() => handleExport(visible)}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Export do Excelu
        </button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm whitespace-nowrap">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-900">
              {[
                "Rozhodca",
                "Vyplnené",
                "E-mail",
                "Telefón",
                "Adresa",
                "Dátum nar.",
                "Rodné číslo",
                "IBAN",
                "Dres / trenky / ponožky",
                "Zmluva",
                "Č. zmluvy",
                "Lic.",
                "Domáci región",
                "Kategórie",
                "Výpis RT",
                "Foto",
              ].map((label) => (
                <th
                  key={label}
                  className="px-2 py-2 text-left text-xs font-semibold text-zinc-500"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((referee) => {
              const filled = filledCount(referee);
              const complete = filled === PROFILE_FIELDS.length;
              const sizes = [referee.jersey_size, referee.shorts_size, referee.socks_size];

              return (
                <tr
                  key={referee.id}
                  className="border-t border-zinc-100 dark:border-zinc-900"
                >
                  <td className="px-2 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                    {referee.full_name}
                  </td>
                  <td className="px-2 py-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        complete
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : filled === 0
                            ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                            : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      }`}
                    >
                      {filled}/{PROFILE_FIELDS.length}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-zinc-600 dark:text-zinc-300">
                    <Cell value={referee.email} />
                  </td>
                  <td className="px-2 py-2 text-zinc-600 dark:text-zinc-300">
                    <Cell value={referee.phone} />
                  </td>
                  <td className="px-2 py-2 text-zinc-600 dark:text-zinc-300">
                    <Cell value={referee.address} />
                  </td>
                  <td className="px-2 py-2 text-zinc-600 dark:text-zinc-300">
                    <Cell value={formatDate(referee.date_of_birth)} />
                  </td>
                  <td className="px-2 py-2 text-zinc-600 dark:text-zinc-300">
                    <Cell value={referee.birth_number} />
                  </td>
                  <td className="px-2 py-2 text-zinc-600 dark:text-zinc-300">
                    <Cell value={referee.bank_account} />
                  </td>
                  <td className="px-2 py-2 text-zinc-600 dark:text-zinc-300">
                    {sizes.some(Boolean) ? (
                      sizes.map((s) => s || "—").join(" / ")
                    ) : (
                      <Cell value={null} />
                    )}
                  </td>
                  <td className="px-2 py-2 text-zinc-600 dark:text-zinc-300">
                    <Cell
                      value={referee.contract_type ? CONTRACT_LABELS[referee.contract_type] : null}
                    />
                  </td>
                  <td className="px-2 py-2 text-zinc-600 dark:text-zinc-300">
                    <Cell value={referee.contract_number} />
                  </td>
                  <td className="px-2 py-2 text-center text-zinc-600 dark:text-zinc-300">
                    <Cell value={referee.license_level} />
                  </td>
                  <td className="px-2 py-2 text-zinc-600 dark:text-zinc-300">
                    <Cell
                      value={referee.home_region ? CATEGORY_LABELS[referee.home_region] : null}
                    />
                  </td>
                  <td className="px-2 py-2 text-zinc-600 dark:text-zinc-300">
                    <Cell
                      value={
                        (categories[referee.id] ?? [])
                          .map((c) => CATEGORY_LABELS[c])
                          .join(", ") || null
                      }
                    />
                  </td>
                  <td className="px-2 py-2 text-zinc-600 dark:text-zinc-300">
                    <Cell value={formatDate(referee.criminal_record_uploaded_at)} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    {referee.photo_path ? (
                      <span className="text-emerald-600 dark:text-emerald-400">✓</span>
                    ) : (
                      <Cell value={null} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {visible.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-400">
            Nikto nezodpovedá filtru.
          </p>
        )}
      </div>
    </div>
  );
}
