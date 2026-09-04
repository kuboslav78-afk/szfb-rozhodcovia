import Link from "next/link";

type Props = {
  /** Počet hracích dní bez vyplnenej dostupnosti v najbližšom období. */
  count: number;
  /** Najbližší nevyplnený deň — nech rozhodca vie, či to horí. */
  nearest: string;
  /** Odkaz vedie rovno na mesiac, v ktorom ten deň je. */
  monthParam: string;
};

function dayLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Pripomienka nevyplnenej dostupnosti na najbližšie hracie dni. */
export function AvailabilityPrompt({ count, nearest, monthParam }: Props) {
  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-amber-950">
              !
            </span>
            <h2 className="font-semibold text-amber-900 dark:text-amber-200">
              Vyplň si dostupnosť
            </h2>
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
              {count} {count === 1 ? "deň" : count < 5 ? "dni" : "dní"}
            </span>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/90 dark:text-amber-200/90">
            Bez nej ťa nevieme nominovať na zápasy. Najbližší nevyplnený hrací deň je{" "}
            <span className="font-semibold">{dayLabel(nearest)}</span>.
          </p>
        </div>

        <Link
          href={`/dostupnost?month=${monthParam}`}
          className="shrink-0 rounded-lg bg-brand-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark"
        >
          Vyplniť dostupnosť
        </Link>
      </div>
    </div>
  );
}
