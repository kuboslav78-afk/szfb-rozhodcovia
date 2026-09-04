"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { syncVenues } from "@/app/venues/actions";

type Props = {
  /** Koľko hál je v lokálnom adresári. */
  total: number;
  /** Haly, ktoré sa vyskytujú v zápasoch, ale v adresári sa nenašli. */
  unmatched: string[];
};

export function VenuesPanel({ total, unmatched }: Props) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const { total: count } = await syncVenues();
      setResult(`Načítaných ${count} hál zo szfb.sk.`);
      router.refresh();
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Nepodarilo sa načítať.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="mb-10 rounded-xl border border-zinc-200 px-5 py-4 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
            Športové haly
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {total === 0
              ? "Adresár ešte nie je načítaný — stiahni ho zo szfb.sk."
              : `${total} hál s adresou zo szfb.sk.`}{" "}
            Adresu haly potrebuje výkaz k príkaznej zmluve a mesto rozhoduje o príplatku
            pri SZČO.
          </p>

          {unmatched.length > 0 && (
            <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-500">
              <span className="font-semibold">
                {unmatched.length === 1
                  ? "1 hala zo zápasov nie je v adresári"
                  : `${unmatched.length} hál zo zápasov nie je v adresári`}
              </span>{" "}
              — {unmatched.slice(0, 3).join(", ")}
              {unmatched.length > 3 ? " a ďalšie" : ""}. Skús adresár aktualizovať; ak
              nepomôže, hala na szfb.sk chýba alebo je inak pomenovaná.
            </p>
          )}

          {result && (
            <p className="mt-1.5 text-xs text-emerald-600 dark:text-emerald-400">{result}</p>
          )}
        </div>

        <button
          type="button"
          disabled={syncing}
          onClick={handleSync}
          className="shrink-0 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {syncing ? "Načítavam…" : "Načítať zo szfb.sk"}
        </button>
      </div>
    </div>
  );
}
