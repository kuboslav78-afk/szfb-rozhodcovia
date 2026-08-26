"use client";

import { useState, useTransition } from "react";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/categories";
import { setCategoryAdmin, setSuperAdmin, setViewer } from "@/app/admin-users/actions";

type Referee = { id: string; full_name: string; role: "admin" | "referee" | "viewer" };

type Props = {
  referees: Referee[];
  initialAdmins: Record<string, Category[]>;
};

function SuperAdminCell({ referee }: { referee: Referee }) {
  const [checked, setChecked] = useState(referee.role === "admin");
  const [, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setChecked(next);
    startTransition(async () => {
      await setSuperAdmin(referee.id, next);
    });
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => handleChange(e.target.checked)}
      className="h-4 w-4 accent-brand-red"
    />
  );
}

function ViewerCell({ referee }: { referee: Referee }) {
  const [checked, setChecked] = useState(referee.role === "viewer");
  const [, startTransition] = useTransition();

  function handleChange(next: boolean) {
    setChecked(next);
    startTransition(async () => {
      await setViewer(referee.id, next);
    });
  }

  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => handleChange(e.target.checked)}
      className="h-4 w-4 accent-zinc-500"
    />
  );
}

export function CategoryAdminsManager({ referees, initialAdmins }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const [admins, setAdmins] = useState(
    () =>
      new Map(
        Object.entries(initialAdmins).map(([id, cats]) => [id, new Set(cats)]),
      ),
  );
  const [isPending, startTransition] = useTransition();

  function toggle(refereeId: string, category: Category) {
    const current = admins.get(refereeId) ?? new Set<Category>();
    const next = !current.has(category);

    setAdmins((prev) => {
      const copy = new Map(prev);
      const set = new Set(copy.get(refereeId) ?? []);
      if (next) set.add(category);
      else set.delete(category);
      copy.set(refereeId, set);
      return copy;
    });

    startTransition(async () => {
      await setCategoryAdmin(refereeId, category, next);
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
            Kategórie = admin práva len pre daný región/kategóriu.{" "}
            <span className="font-semibold text-brand-red">Super Admin</span>{" "}
            = plný prístup ku všetkému, vrátane správy ostatných adminov —
            udeľuj opatrne. <span className="font-semibold">Viewer</span> = vidí
            prehľad všetkých kategórií, ale nič nemôže upravovať.
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
              <th className="border-l border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-brand-red dark:border-zinc-800">
                Super Admin
              </th>
              <th className="border-l border-zinc-200 px-2 py-2 text-center text-xs font-semibold text-zinc-500 dark:border-zinc-800">
                Viewer
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
              const refereeAdmins = admins.get(referee.id) ?? new Set();

              return (
                <tr
                  key={referee.id}
                  className="border-t border-zinc-100 dark:border-zinc-900"
                >
                  <td className="whitespace-nowrap px-2 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                    {referee.full_name}
                  </td>
                  <td className="border-l border-zinc-100 px-2 py-2 text-center dark:border-zinc-900">
                    <SuperAdminCell referee={referee} />
                  </td>
                  <td className="border-l border-zinc-100 px-2 py-2 text-center dark:border-zinc-900">
                    <ViewerCell referee={referee} />
                  </td>
                  {CATEGORIES.map((category) => (
                    <td key={category} className="px-2 py-2 text-center">
                      <input
                        type="checkbox"
                        disabled={isPending}
                        checked={refereeAdmins.has(category)}
                        onChange={() => toggle(referee.id, category)}
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
