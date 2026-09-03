"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AppHeader } from "@/components/AppHeader";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (user) {
        router.replace("/");
        router.refresh();
        return;
      }

      setCheckingSession(false);
    }

    checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();

      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) {
        throw loginError;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("Nesprávny e-mail alebo heslo.");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <>
        <AppHeader />
        <main className="flex flex-1 items-center justify-center bg-zinc-50 dark:bg-black">
          <p className="text-sm font-medium text-zinc-500">
            Kontrolujem prihlásenie…
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
          Portál rozhodcov SZFB
        </h1>
        <p className="mt-3 text-sm text-zinc-500">
          Prihlás sa svojím účtom.
        </p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300"
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-zinc-600 dark:text-zinc-300"
            >
              Heslo
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
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
            {loading ? "Prihlasujem…" : "Prihlásiť sa"}
          </button>
        </form>
      </div>
      </main>
    </>
  );
}
