"use client";

import { useState, useTransition } from "react";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/categories";
import {
  setCategoryAccess,
  setKroMember,
  setRefereeRole,
  type CategoryAccessLevel,
} from "@/app/admin-users/actions";

type Role = "admin" | "referee" | "viewer";
type Referee = { id: string; full_name: string; role: Role; kro_member: boolean };

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

/** Členstvo v komisii — nezávislé od kategóriového prístupu. */
function KroCell({ referee }: { referee: Referee }) {
  const [member, setMember] = useState(referee.kro_member);
  const [, startTransition] = useTransition();

  return (
    <input
      type="checkbox"
      checked={member}
      title="Člen KRO — nevypĺňa testy, vidí banku otázok aj výsledky všetkých"
      onChange={() => {
        const next = !member;
        setMember(next);
        startTransition(async () => {
          await setKroMember(referee.id, next);
        });
      }}
      className="h-4 w-4 accent-brand-indigo"
    />
  );
}

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

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function CategoryAdminsManager({ referees, initialAccess }: Props) {
  const [collapsed, setCollapsed] = useState(true);
  const [access, setAccess] = useState(() => new Map(Object.entries(initialAccess)));
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");

  // V tabuľke sú len súčasní administrátori — rozhodcov sú stovky a vypisovať ich
  // všetkých je neprehľadné. Zoznam sa počíta raz pri načítaní, takže nikto
  // nezmizne spod ruky, keď mu práve odoberáš poslednú kategóriu.
  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => {
    const ids = new Set<string>();
    for (const referee of referees) {
      if (referee.role !== "referee") ids.add(referee.id);
      else if (Object.keys(initialAccess[referee.id] ?? {}).length > 0) ids.add(referee.id);
    }
    return ids;
  });

  function levelFor(refereeId: string, category: Category): CategoryAccessLevel {
    return access.get(refereeId)?.[category] ?? "none";
  }

  function hasAnyAccess(refereeId: string) {
    return Object.keys(access.get(refereeId) ?? {}).length > 0;
  }

  const visibleReferees = referees.filter((r) => visibleIds.has(r.id));

  const query = normalize(search);
  const suggestions =
    query.length >= 2
      ? referees
          .filter((r) => !visibleIds.has(r.id) && normalize(r.full_name).includes(query))
          .slice(0, 8)
      : [];

  function addToList(refereeId: string) {
    setVisibleIds((prev) => new Set(prev).add(refereeId));
    setSearch("");
  }

  /** Odobratie z tabuľky je čisto vizuálne — dá sa len u toho, kto nemá žiadne práva. */
  function removeFromList(refereeId: string) {
    setVisibleIds((prev) => {
      const copy = new Set(prev);
      copy.delete(refereeId);
      return copy;
    });
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
            {visibleIds.size === 0
              ? "Zatiaľ nikto — pridaj administrátora vyhľadaním mena."
              : `${visibleIds.size} ${visibleIds.size === 1 ? "osoba" : visibleIds.size < 5 ? "osoby" : "osôb"} s prístupom do administrácie.`}
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
            udeľuj opatrne. <span className="font-semibold">KRO</span> = člen komisie:
            nevypĺňa týždenné testy a vidí banku otázok aj výsledky všetkých. Je to
            nezávislé od kategórií — tie má aj nominačné oddelenie, ktoré testy robiť
            má. <span className="font-semibold">Viewer</span> = celoplošne
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

      <div className="relative mt-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Pridať administrátora — začni písať meno…"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-brand-indigo dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
        />
        {query.length >= 2 && (
          <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {suggestions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-zinc-400">
                Nikto taký — alebo už je v zozname nižšie.
              </p>
            ) : (
              suggestions.map((referee) => (
                <button
                  key={referee.id}
                  type="button"
                  onClick={() => addToList(referee.id)}
                  className="block w-full px-3 py-2 text-left text-sm text-zinc-700 transition hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800"
                >
                  {referee.full_name}
                </button>
              ))
            )}
          </div>
        )}
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
              <th className="px-2 py-2 text-center text-xs font-medium text-zinc-400">
                KRO
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
            {visibleReferees.map((referee) => {
              return (
                <tr
                  key={referee.id}
                  className="border-t border-zinc-100 dark:border-zinc-900"
                >
                  <td className="whitespace-nowrap px-2 py-2 font-medium text-zinc-800 dark:text-zinc-200">
                    <span className="flex items-center gap-2">
                      {referee.full_name}
                      {!hasAnyAccess(referee.id) && referee.role === "referee" && (
                        <button
                          type="button"
                          title="Odobrať zo zoznamu"
                          onClick={() => removeFromList(referee.id)}
                          className="text-zinc-300 transition hover:text-red-600 dark:text-zinc-600 dark:hover:text-red-400"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  </td>
                  <td className="border-l border-zinc-100 px-2 py-2 text-center dark:border-zinc-900">
                    <RoleCell referee={referee} />
                  </td>
                  <td className="px-2 py-2 text-center">
                    <KroCell referee={referee} />
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

        {visibleReferees.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-400">
            Zatiaľ tu nikto nie je — vyhľadaj meno vyššie a pridaj ho.
          </p>
        )}
      </div>
    </div>
  );
}
