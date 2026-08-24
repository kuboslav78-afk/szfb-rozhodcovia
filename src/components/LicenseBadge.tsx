import { LICENSE_LABELS, type LicenseLevel } from "@/lib/licenses";

const COLORS: Record<LicenseLevel, string> = {
  N: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  C: "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  B: "bg-brand-indigo/15 text-brand-indigo dark:text-white",
};

export function LicenseBadge({ level }: { level: LicenseLevel | null | undefined }) {
  if (!level) return null;

  return (
    <span
      title={LICENSE_LABELS[level]}
      className={`ml-1.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${COLORS[level]}`}
    >
      {level}
    </span>
  );
}
