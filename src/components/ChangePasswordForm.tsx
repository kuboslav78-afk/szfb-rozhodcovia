"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function ChangePasswordForm() {
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (password.length < 8) {
      setError("Heslo musí mať aspoň 8 znakov.");
      return;
    }

    if (password !== password2) {
      setError("Heslá sa nezhodujú.");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setPassword("");
    setPassword2("");
    setSuccess(true);
  }

  return (
    <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
        Zmena hesla
      </h2>
      <p className="mt-1 text-xs text-zinc-500">
        Ak používaš predvolené heslo, odporúčame si ho teraz zmeniť.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 max-w-sm space-y-3">
        <div>
          <label
            htmlFor="new-password"
            className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300"
          >
            Nové heslo
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        <div>
          <label
            htmlFor="new-password2"
            className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300"
          >
            Zopakuj nové heslo
          </label>
          <input
            id="new-password2"
            type="password"
            value={password2}
            onChange={(event) => setPassword2(event.target.value)}
            autoComplete="new-password"
            required
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-brand-indigo focus:ring-2 focus:ring-brand-indigo/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
            Heslo bolo zmenené.
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Ukladám…" : "Zmeniť heslo"}
        </button>
      </form>
    </div>
  );
}
