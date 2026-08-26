import { RELATION_LABELS, type RefereeRelation } from "@/lib/categories";

const STYLES: Record<RefereeRelation, string> = {
  domaci:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  celostatny: "bg-brand-indigo/15 text-brand-indigo dark:text-white",
  hostujuci:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
};

export function RelationBadge({
  relation,
}: {
  relation: RefereeRelation | null;
}) {
  if (!relation) return null;

  return (
    <span
      className={`ml-1.5 inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${STYLES[relation]}`}
    >
      {RELATION_LABELS[relation]}
    </span>
  );
}
