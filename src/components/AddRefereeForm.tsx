"use client";

import { FormEvent, useState } from "react";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/categories";
import { LICENSE_LEVELS, LICENSE_LABELS, type LicenseLevel } from "@/lib/licenses";
import { createReferee } from "@/app/admin-users/actions";

export function AddRefereeForm() {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [license, setLicense] = useState<LicenseLevel | "">("");
  const [participate, setParticipate] = useState<Set<Category>>(
    new Set(),
  );
  const [adminFor, setAdminFor] = useState<Set<Category>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ password: string } | null>(null);

  function toggleSet(
    set: Set<Category>,
    setter: (s: Set<Category>) => void,
    category: Category,
  ) {
    const copy = new Set(set);
    if (copy.has(category)) copy.delete(category);
    else copy.add(category);
    setter(copy);
  }

  function reset() {
    setFullName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setLicense("");
    setParticipate(new Set(["celostatny"]));
    setAdminFor(new Set());
    setCreated(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await createReferee({
        fullName,
        email,
        phone: phone || null,
        address: address || null,
        license: license || null,
        participateCategories: Array.from(participate),
        adminCategories: Array.from(adminFor),
      });
      setCreated(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodarilo sa vytvoriť účet.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <div className="mb-10">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg bg-brand-indigo px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark"
        >
          + Pridať rozhodcu
        </button>
      </div>
    );
  }

  return (
    <div className="mb-10 rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
          Pridať rozhodcu
        </h2>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            reset();
          }}
          className="text-sm text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
        >
          Zavrieť
        </button>
      </div>

      {created ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
          <p className="font-medium">Účet vytvorený.</p>
          <p className="mt-1">
            Predvolené heslo: <span className="font-mono">{created.password}</span>
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-3 rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100 dark:border-emerald-800 dark:text-emerald-200"
          >
            Pridať ďalšieho
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 max-w-lg space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Meno a priezvisko
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Telefón (voliteľné)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Adresa (voliteľné)
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ulica 12, 811 01 Bratislava"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Licencia (voliteľné)
            </label>
            <select
              value={license}
              onChange={(e) => setLicense(e.target.value as LicenseLevel | "")}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            >
              <option value="">— nevybraté —</option>
              {LICENSE_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level} — {LICENSE_LABELS[level]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Kategórie (kde bude rozhodovať)
            </p>
            <p className="mb-1.5 text-xs text-zinc-500">
              Pre nového regionálneho rozhodcu nechaj prázdne — pri prvom
              prihlásení si sám zvolí domáci región.
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleSet(participate, setParticipate, category)}
                  className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                    participate.has(category)
                      ? "border-brand-indigo bg-brand-indigo/10 text-brand-indigo dark:text-white"
                      : "border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  }`}
                >
                  {CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-300">
              Admin práva pre kategórie (voliteľné)
            </p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleSet(adminFor, setAdminFor, category)}
                  className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
                    adminFor.has(category)
                      ? "border-brand-red bg-brand-red/10 text-brand-red"
                      : "border-zinc-300 text-zinc-500 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
                  }`}
                >
                  {CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-brand-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Vytváram…" : "Vytvoriť účet"}
          </button>
        </form>
      )}
    </div>
  );
}
