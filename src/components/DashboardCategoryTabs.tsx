import Link from "next/link";
import { CATEGORY_LABELS, type Category } from "@/lib/categories";

type Props = {
  /** Kategórie, ku ktorým má prihlásený admin prístup. */
  categories: Category[];
  /** null = zobrazujú sa všetky jeho kategórie naraz. */
  active: Category | null;
};

const TAB_CLASSES = "rounded-md px-3 py-1.5 font-medium transition";
const ACTIVE_CLASSES = "bg-brand-indigo text-white";
const INACTIVE_CLASSES = "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200";

export function DashboardCategoryTabs({ categories, active }: Props) {
  // Regionálny admin s jedinou kategóriou nemá medzi čím prepínať.
  if (categories.length <= 1) return null;

  return (
    <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-zinc-200 p-1 text-sm dark:border-zinc-800">
      <Link
        href="/"
        className={`${TAB_CLASSES} ${active === null ? ACTIVE_CLASSES : INACTIVE_CLASSES}`}
      >
        Všetky
      </Link>
      {categories.map((category) => (
        <Link
          key={category}
          href={`/?category=${category}`}
          className={`${TAB_CLASSES} ${category === active ? ACTIVE_CLASSES : INACTIVE_CLASSES}`}
        >
          {CATEGORY_LABELS[category]}
        </Link>
      ))}
    </div>
  );
}
