import { CONTRACT_LABELS, isContractType } from "@/lib/contracts";
import type { Earnings, OverallEarnings } from "@/lib/earnings";

function eur(value: number): string {
  return `${value.toFixed(2)} €`;
}

function Row({
  label,
  value,
  hint,
  strong,
}: {
  label: string;
  value: string;
  hint?: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-sm text-zinc-500">
        {label}
        {hint && <span className="ml-1 text-[11px] text-zinc-400">{hint}</span>}
      </span>
      <span
        className={
          strong
            ? "font-headline text-xl text-zinc-800 dark:text-zinc-100"
            : "text-sm font-semibold text-zinc-700 dark:text-zinc-300"
        }
      >
        {value}
      </span>
    </div>
  );
}

/** Zárobok rozhodcu za sezónu — na jeho vlastnom dashboarde. */
export function EarningsCard({ earnings }: { earnings: Earnings }) {
  const nothingYet = earnings.earnedCount === 0 && earnings.upcomingCount === 0;

  return (
    <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="mb-4 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
        Odmeny
      </div>

      {nothingYet ? (
        <p className="text-sm text-zinc-400">
          Zatiaľ nemáš potvrdenú žiadnu nomináciu — odmeny sa začnú počítať po prvom
          odpískanom zápase.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <Row
            label="Odpískané"
            hint={`${earnings.earnedCount} ${earnings.earnedCount === 1 ? "zápas" : earnings.earnedCount < 5 ? "zápasy" : "zápasov"}`}
            value={eur(earnings.earnedTotal)}
            strong
          />
          <Row label="Tento mesiac" value={eur(earnings.monthTotal)} />
          {earnings.upcomingCount > 0 && (
            <Row
              label="Čaká na odohranie"
              hint={`${earnings.upcomingCount}×`}
              value={eur(earnings.upcomingTotal)}
            />
          )}
        </div>
      )}

      <p className="mt-4 border-t border-zinc-100 pt-3 text-[11px] leading-relaxed text-zinc-400 dark:border-zinc-900">
        Orientačný prepočet podľa sadzobníka z potvrdených nominácií. Rozhodujúce je
        vyúčtovanie, ktoré pripravuje KRO.
      </p>
    </div>
  );
}

/** Súhrn za všetkých rozhodcov — pre KRO. */
export function OverallEarningsCard({ earnings }: { earnings: OverallEarnings }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="mb-4 text-xs font-semibold tracking-wide text-zinc-400 uppercase">
        Odmeny
      </div>

      <div className="flex flex-col gap-3">
        <Row
          label="Odpískané"
          hint={`${earnings.earnedCount}×`}
          value={eur(earnings.earnedTotal)}
          strong
        />
        <Row label="Tento mesiac" value={eur(earnings.monthTotal)} />
        <Row
          label="Čaká na odohranie"
          hint={`${earnings.upcomingCount}×`}
          value={eur(earnings.upcomingTotal)}
        />
      </div>

      {earnings.byContract.length > 0 && (
        <div className="mt-4 border-t border-zinc-100 pt-3 dark:border-zinc-900">
          <div className="mb-2 text-[11px] font-semibold tracking-wide text-zinc-400 uppercase">
            Podľa zmluvy
          </div>
          <div className="flex flex-col gap-1.5">
            {earnings.byContract.map((row) => (
              <div key={row.contractType} className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-zinc-500">
                  {isContractType(row.contractType)
                    ? CONTRACT_LABELS[row.contractType]
                    : "Neurčená"}
                  <span className="ml-1 text-[11px] text-zinc-400">
                    {row.referees}{" "}
                    {row.referees === 1 ? "rozhodca" : row.referees < 5 ? "rozhodcovia" : "rozhodcov"}
                  </span>
                </span>
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {eur(row.total)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="mt-4 border-t border-zinc-100 pt-3 text-[11px] leading-relaxed text-zinc-400 dark:border-zinc-900">
        Z potvrdených nominácií podľa sadzobníka. Pri SZČO je započítaný aj príplatok za
        cestu mimo mesta sídla firmy.
      </p>
    </div>
  );
}
