"use client";

import { useState, useTransition } from "react";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/categories";
import {
  setCategoryAccess,
  setRefereeRole,
  type CategoryAccessLevel,
} from "@/app/admin-users/actions";

type Role = "admin" | "referee" | "viewer";
type Referee = { id: string; full_name: string; role: Role };

type Props = {
  referees: Referee[];
  /** Úroveň prístupu ku každej kategórii, ktorú rozhodca má (chýbajúca = "none"). */
  initialAccess: Record<string, Partial<Record<Category, CategoryAccessLevel>>>;
};

const ACCESS_LABELS: Record<CategoryAccessLevel, string> = {
  none: "—",
  view: "Nahliadnuť",
  edit: "Upravovať",
};

const ROLE_LABELS: Record<Role, string> = {
  referee: "Rozhodca",
  viewer: "Viewer",
  admin: "Super Admin",
};

const ROLE_CONFIRM_MESSAGE: Record<Role, (name: string) => string> = {
  referee: (name) => `Odobrať ${name} rolu a vrátiť ho na bežného rozhodcu?`,
  viewer: (name) =>
    `Nastaviť ${name} ako Viewer? Uvidí prehľad všetkých kategórií, ale stratí možnosť čokoľvek upravovať (vrátane vlastnej dostupnosti, ak ju doteraz vypĺňal).`,
  admin: (name) =>
    `Urobiť z ${name} plnohodnotného Super Admina? Bude mať plný prístup ku všetkému, vrátane správy ostatných adminov.`,
};

function RoleCell({ referee }: { referee: Referee }) {
  const [role, setRole] = useState<Role>(referee.role);
  const [, startTransition] = useTransition();

  function handleChange(next: Role) {
    if (next === role) return;
    if (!window.confirm(ROLE_CONFIRM_MESSAGE[next](referee.full_name))) {
      return;
    }
    setRole(next);
    startTransition(async () => {
      await setRefereeRole(referee.id, next);
    });
  }

  return (
    <select
      value={role}
      onChange={(e) => handleChange(e.target.value as Role)}
      className={`rounded-md border bg-white px-1.5 py-1 text-xs outline-none focus:border-brand-indigo dark:bg-zinc-900 ${
        role === "admin"
          ? "border-brand-red font-semibold text-brand-red"
          : role === "viewer"
            ? "border-zinc-300 font-semibold text-zinc-500 dark:border-zinc-700"
            : "border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
      }`}
    >
      <option value="referee">{ROLE_LABELS.referee}</option>
      <option value="viewer">{ROLE_LABELS.viewer}</option>
      <option value="admin">{ROLE_LABELS.admin}</option>
    </select>
  );
}

export function CategoryAdminsManager({ referees, initialAccess }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const [access, setAccess] = useState(() => new Map(Object.entries(initialAccess)));
  const [isPending, startTransition] = useTransition();

  function levelFor(refereeId: string, category: Category): CategoryAccessLevel {
    return access.get(refereeId)?.[category] ?? "none";
  }

  function change(
    refereeId: string,
    refereeName: string,
    category: Category,
    next: CategoryAccessLevel,
  ) {
    const current = levelFor(refereeId, category);
    if (next === current) return;

    // Odobratie práv aj degradáciu na nahliadnutie potvrdzujeme — obe niekomu
    // niečo berú, na rozdiel od povýšenia.
    if (
      current === "edit" &&
      !window.confirm(
        next === "none"
          ? `Odobrať ${refereeName} prístup ku kategórii ${CATEGORY_LABELS[category]}?`
          : `Zmeniť ${refereeName} v kategórii ${CATEGORY_LABELS[category]} na iba nahliadnutie? Stratí právo čokoľvek tam upravovať.`,
      )
    ) {
      return;
    }

    setAccess((prev) => {
      const copy = new Map(prev);
      const forReferee = { ...(copy.get(refereeId) ?? {}) };
      if (next === "none") delete forReferee[category];
      else forReferee[category] = next;
      copy.set(refereeId, forReferee);
      return copy;
    });

    startTransition(async () => {
      await setCategoryAccess(refereeId, category, next);
    });
  }

  if (collapsed) {
    return (
      <div className="mb-10 flex items-center justify-between rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800">
        <div>
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Administrátori
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Udeľ niekomu admin práva pre konkrétny región, alebo z neho urob
            plnohodnotného administrátora.
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
            Administrátori
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Pri každej kategórii nastav <span className="font-semibold">Upravovať</span>{" "}
            (plné admin práva pre daný región) alebo{" "}
            <span className="font-semibold">Nahliadnuť</span> (vidí prehľad, ale nič
            nemení — napr. člen KRO). Rozhodcovská časť ostáva nedotknutá, takže si
            svoju dostupnosť aj nominácie vypĺňa ďalej cez prepínač Admin/Rozhodca.{" "}
            <span className="font-semibold text-brand-red">Super Admin</span>{" "}
            = plný prístup ku všetkému, vrátane správy ostatných adminov —
            udeľuj opatrne. <span className="font-semibold">Viewer</span> = celoplošne
            len na čítanie, ale stratí aj vlastnú dostupnosť — pre členov KRO, ktorí sú
            zároveň rozhodcami, použi radšej Nahliadnuť.
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
              <th className="border-l border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-500 dark:border-zinc-800">
                Rola
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
              return (
                <tr
                  key={referee.id}
                  className="border-t border-zinc-100 dark:border-zinc-900"
                >
                  <td className="whitespace-nowrap px-2 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                    {referee.full_name}
                  </td>
                  <td className="border-l border-zinc-100 px-2 py-2 text-center dark:border-zinc-900">
                    <RoleCell referee={referee} />
                  </td>
                  {CATEGORIES.map((category) => {
                    const level = levelFor(referee.id, category);
                    return (
                      <td key={category} className="px-2 py-2 text-center">
                        <select
                          disabled={isPending}
                          value={level}
                          onChange={(e) =>
                            change(
                              referee.id,
                              referee.full_name,
                              category,
                              e.target.value as CategoryAccessLevel,
                            )
                          }
                          className={`rounded-md border bg-white px-1.5 py-1 text-xs outline-none focus:border-brand-indigo dark:bg-zinc-900 ${
                            level === "edit"
                              ? "border-brand-indigo font-semibold text-brand-indigo"
                              : level === "view"
                                ? "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
                                : "border-zinc-200 text-zinc-400 dark:border-zinc-800"
                          }`}
                        >
                          <option value="none">{ACCESS_LABELS.none}</option>
                          <option value="view">{ACCESS_LABELS.view}</option>
                          <option value="edit">{ACCESS_LABELS.edit}</option>
                        </select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
