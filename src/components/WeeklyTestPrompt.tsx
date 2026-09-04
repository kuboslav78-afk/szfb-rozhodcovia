import Link from "next/link";

type Props = {
  /** Test tohto týždňa je založený, ale ešte neodoslaný. */
  started: boolean;
};

/** Pripomienka týždenného testu — zobrazuje sa, kým ho rozhodca neodošle. */
export function WeeklyTestPrompt({ started }: Props) {
  return (
    <div className="mb-6 rounded-xl border border-brand-indigo/30 bg-brand-indigo/5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-indigo text-xs font-bold text-white">
              ?
            </span>
            <h2 className="font-semibold text-zinc-800 dark:text-zinc-100">
              {started ? "Máš rozpracovaný týždenný test" : "Čaká ťa týždenný test"}
            </h2>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
            <span className="font-semibold">Vyplnenie testu je povinné.</span>{" "}
            {started
              ? "Test na tento týždeň máš otvorený, ale ešte neodoslaný. Odoslať sa dá raz — potom uvidíš správne odpovede aj vysvetlenia."
              : "Desať otázok z pravidiel florbalu. Zaberie to pár minút a po odoslaní uvidíš správne odpovede aj vysvetlenia."}
          </p>
        </div>

        <Link
          href="/testovanie"
          className="shrink-0 rounded-lg bg-brand-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark"
        >
          {started ? "Dokončiť test" : "Spustiť test"}
        </Link>
      </div>
    </div>
  );
}
