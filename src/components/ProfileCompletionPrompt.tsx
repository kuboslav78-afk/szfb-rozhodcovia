import Link from "next/link";
import {
  PROFILE_FIELDS,
  PROFILE_FIELD_LABELS,
  type ProfileField,
} from "@/lib/profile-completeness";

type Props = {
  missingFields: ProfileField[];
  missingCriminalRecord: boolean;
};

export function ProfileCompletionPrompt({ missingFields, missingCriminalRecord }: Props) {
  if (missingFields.length === 0 && !missingCriminalRecord) return null;

  const filled = PROFILE_FIELDS.length - missingFields.length;
  const items = [
    ...missingFields.map((field) => PROFILE_FIELD_LABELS[field]),
    ...(missingCriminalRecord ? ["výpis z registra trestov"] : []),
  ];

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-amber-950">
              !
            </span>
            <h2 className="font-semibold text-amber-900 dark:text-amber-200">
              Doplň si údaje v profile
            </h2>
            <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900 dark:bg-amber-900 dark:text-amber-200">
              {filled}/{PROFILE_FIELDS.length}
            </span>
          </div>

          <p className="mt-2 text-sm leading-relaxed text-amber-900/90 dark:text-amber-200/90">
            Bez nich ti nevieme pripraviť zmluvu, vyplatiť odmeny za odpískané zápasy
            ani objednať výstroj. Chýba:{" "}
            <span className="font-semibold">{items.join(", ")}</span>.
          </p>
        </div>

        <Link
          href="/profil"
          className="shrink-0 rounded-lg bg-brand-indigo px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-indigo-dark"
        >
          Doplniť údaje
        </Link>
      </div>
    </div>
  );
}
