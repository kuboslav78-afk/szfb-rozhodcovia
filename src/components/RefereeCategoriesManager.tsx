"use client";

import { useState, useTransition } from "react";
import { CATEGORIES, CATEGORY_LABELS, REGIONS, type Category } from "@/lib/categories";
import { LICENSE_LEVELS, type LicenseLevel } from "@/lib/licenses";
import { adminSetRefereeCategory } from "@/app/referee-categories/actions";
import {
  updateRefereeName,
  updateRefereeLicense,
  adminSetHomeRegion,
  updateRefereeContract,
} from "@/app/admin-users/actions";
import {
  CONTRACT_LABELS,
  CONTRACT_TYPES,
  type ContractType,
} from "@/lib/contracts";
import { LicenseBadge } from "@/components/LicenseBadge";

type Referee = {
  id: string;
  full_name: string;
  license_level: LicenseLevel | null;
  home_region: Category | null;
  contract_type: ContractType | null;
  contract_number: string | null;
};

type Props = {
  referees: Referee[];
  initialCategories: Record<string, Category[]>;
};

function NameCell({ referee }: { referee: Referee }) {
  const [value, setValue] = useState(referee.full_name);
  const [, startTransition] = useTransition();

  function handleBlur() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === referee.full_name) {
      setValue(referee.full_name);
      return;
    }

    startTransition(async () => {
      await updateRefereeName(referee.id, trimmed);
    });
  }

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      className="w-full min-w-[140px] rounded-md border border-transparent bg-transparent px-1.5 py-1 font-medium text-zinc-800 outline-none transition hover:border-zinc-200 focus:border-brand-indigo focus:bg-white dark:text-zinc-200 dark:hover:border-zinc-700 dark:focus:bg-zinc-900"
    />
  );
}

/** Typ zmluvy a jej číslo idú spolu — číslo bez typu nedáva zmysel. */
function ContractCell({ referee }: { referee: Referee }) {
  const [type, setType] = useState<ContractType | "">(referee.contract_type ?? "");
  const [number, setNumber] = useState(referee.contract_number ?? "");
  const [, startTransition] = useTransition();

  function save(nextType: ContractType | "", nextNumber: string) {
    startTransition(async () => {
      await updateRefereeContract(referee.id, nextType || null, nextNumber || null);
    });
  }

  return (
    <div className="flex items-center gap-1">
      <select
        value={type}
        onChange={(e) => {
          const next = e.target.value as ContractType | "";
          setType(next);
          save(next, number);
        }}
        className="rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700 outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      >
        <option value="">—</option>
        {CONTRACT_TYPES.map((contract) => (
          <option key={contract} value={contract}>
            {CONTRACT_LABELS[contract]}
          </option>
        ))}
      </select>
      <input
        type="text"
        value={number}
        onChange={(e) => setNumber(e.target.value)}
        onBlur={() => {
          if ((referee.contract_number ?? "") !== number) save(type, number);
        }}
        placeholder="č. zmluvy"
        title="Číslo zmluvy — prideľuje ekonomický úsek, ide do hromadného príkazu ako variabilný symbol"
        className="w-24 rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700 outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
      />
    </div>
  );
}

function LicenseCell({ referee }: { referee: Referee }) {
  const [value, setValue] = useState<LicenseLevel | "">(referee.license_level ?? "");
  const [, startTransition] = useTransition();

  function handleChange(next: LicenseLevel | "") {
    setValue(next);
    startTransition(async () => {
      await updateRefereeLicense(referee.id, next || null);
    });
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value as LicenseLevel | "")}
      className="rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700 outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
    >
      <option value="">—</option>
      {LICENSE_LEVELS.map((level) => (
        <option key={level} value={level}>
          {level}
        </option>
      ))}
    </select>
  );
}

function HomeRegionCell({ referee }: { referee: Referee }) {
  const [value, setValue] = useState<Category | "">(referee.home_region ?? "");
  const [, startTransition] = useTransition();

  function handleChange(next: Category | "") {
    if (
      value &&
      value !== next &&
      !window.confirm(
        `Zmeniť domáci región rozhodcu ${referee.full_name} z "${CATEGORY_LABELS[value]}" na ${next ? `"${CATEGORY_LABELS[next]}"` : "žiadny"}?`,
      )
    ) {
      return;
    }
    setValue(next);
    startTransition(async () => {
      await adminSetHomeRegion(referee.id, next || null);
    });
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value as Category | "")}
      className="rounded-md border border-zinc-200 bg-white px-1.5 py-1 text-xs text-zinc-700 outline-none focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
    >
      <option value="">— žiadny —</option>
      <option value="celostatny">{CATEGORY_LABELS.celostatny}</option>
      {REGIONS.map((region) => (
        <option key={region} value={region}>
          {CATEGORY_LABELS[region]}
        </option>
      ))}
    </select>
  );
}

export function RefereeCategoriesManager({
  referees,
  initialCategories,
}: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const [categories, setCategories] = useState(
    () =>
      new Map(
        Object.entries(initialCategories).map(([id, cats]) => [
          id,
          new Set(cats),
        ]),
      ),
  );
  const [isPending, startTransition] = useTransition();

  function toggle(refereeId: string, refereeName: string, category: Category) {
    const current = categories.get(refereeId) ?? new Set<Category>();
    const next = !current.has(category);

    if (
      !next &&
      !window.confirm(
        `Odobrať ${refereeName} kategóriu ${CATEGORY_LABELS[category]}? Stratí prístup k hracím dňom a vyplnenej dostupnosti v tejto kategórii.`,
      )
    ) {
      return;
    }

    setCategories((prev) => {
      const copy = new Map(prev);
      const set = new Set(copy.get(refereeId) ?? []);
      if (next) set.add(category);
      else set.delete(category);
      copy.set(refereeId, set);
      return copy;
    });

    startTransition(async () => {
      await adminSetRefereeCategory(refereeId, category, next);
    });
  }

  if (collapsed) {
    return (
      <div className="mb-10 flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Kategórie rozhodcov
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Priraď rozhodcov k regiónom, uprav meno, licenciu, domáci región a
            udeľ celoštátny status.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Spravovať
        </button>
      </div>
    );
  }

  return (
    <div className="mb-10 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Kategórie rozhodcov
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Meno uprav kliknutím do políčka. Domáci región si rozhodca zvolí
            sám pri prvom prihlásení, potom ho môže meniť už len admin.
            Celoštátny status udeľuje len admin, ostatné regióny si
            rozhodcovia môžu meniť aj sami. N = nováčik, C = regionálny, B =
            celoštátny.
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

      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="px-2 py-2 text-left font-semibold text-zinc-600 dark:text-zinc-300">
                Rozhodca
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-zinc-400">
                Licencia
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-zinc-400">
                Domáci región
              </th>
              <th className="px-2 py-2 text-center text-xs font-medium text-zinc-400">
                Zmluva
              </th>
              {CATEGORIES.map((category) => (
                <th
                  key={category}
                  className="px-2 py-2 text-center text-xs font-medium text-zinc-400"
                >
                  {CATEGORY_LABELS[category]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {referees.map((referee) => {
              const refereeCategories = categories.get(referee.id) ?? new Set();

              return (
                <tr
                  key={referee.id}
                  className="border-t border-zinc-100 dark:border-zinc-900"
                >
                  <td className="px-0.5 py-1">
                    <div className="flex items-center">
                      <NameCell referee={referee} />
                      <LicenseBadge level={referee.license_level} />
                    </div>
                  </td>
                  <td className="px-2 py-2 text-center">
                    <LicenseCell referee={referee} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <HomeRegionCell referee={referee} />
                  </td>
                  <td className="px-2 py-2">
                    <ContractCell referee={referee} />
                  </td>
                  {CATEGORIES.map((category) => (
                    <td key={category} className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        disabled={isPending}
                        checked={refereeCategories.has(category)}
                        onChange={() => toggle(referee.id, referee.full_name, category)}
                        className="h-4 w-4 accent-brand-indigo"
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
