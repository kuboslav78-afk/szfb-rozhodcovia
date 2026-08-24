"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppHeader } from "@/components/AppHeader";

export default function NastavitHesloPage() {
  const router = useRouter();

  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkError, setLinkError] = useState<string | null>(null);

  useEffect(() => {
    async function establishSession() {
      const supabase = createClient();

      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, ""),
      );

      const errorDescription = hashParams.get("error_description");
      if (errorDescription) {
        setLinkError(
          "Odkaz už nie je platný (bol už použitý alebo mu vypršala platnosť). Požiadaj o nový.",
        );
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        // Odstráň tokeny z URL, nech nezostanú v histórii prehliadača.
        window.history.replaceState(
          null,
          "",
          window.location.pathname,
        );

        if (sessionError) {
          setLinkError(sessionError.message);
          return;
        }

        setReady(true);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session) {
        setReady(true);
      } else {
        setLinkError(
          "Chýba platný odkaz na nastavenie hesla. Otvor stránku znova cez odkaz z e-mailu.",
        );
      }
    }

    establishSession();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

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

    router.replace("/");
    router.refresh();
  }

  if (linkError) {
    return (
      <>
        <AppHeader />
        <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
          <div className="max-w-sm rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {linkError}
          </div>
        </main>
      </>
    );
  }

  if (!ready) {
    return (
      <>
        <AppHeader />
        <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
          <p className="text-sm font-medium text-zinc-500">
            Overujem odkaz z e-mailu…
          </p>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-10 dark:bg-black">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Nastav si heslo
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          Zvoľ si heslo pre prihlásenie do portálu dostupnosti rozhodcov.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300"
            >
              Nové heslo
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div>
            <label
              htmlFor="password2"
              className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300"
            >
              Zopakuj heslo
            </label>
            <input
              id="password2"
              type="password"
              value={password2}
              onChange={(event) => setPassword2(event.target.value)}
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-brand-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Ukladám…" : "Uložiť heslo a pokračovať"}
          </button>
        </form>
      </div>
      </main>
    </>
  );
}
