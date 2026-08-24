import Link from "next/link";
import { CATEGORY_LABELS, type Category } from "@/lib/categories";
import { monthParam, type MonthKey } from "@/lib/dates";

type Props = {
  categories: Category[];
  active: Category;
  monthKey: MonthKey;
  view?: string;
};

export function CategoryTabs({ categories, active, monthKey, view }: Props) {
  if (categories.length <= 1) {
    return null;
  }

  const viewQuery = view ? `&view=${view}` : "";

  return (
    <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-zinc-200 p-1 text-sm dark:border-zinc-800">
      {categories.map((category) => (
        <Link
          key={category}
          href={`/?month=${monthParam(monthKey)}${viewQuery}&category=${category}`}
          className={`rounded-md px-3 py-1.5 font-medium transition ${
            category === active
              ? "bg-brand-indigo text-white"
              : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          {CATEGORY_LABELS[category]}
        </Link>
      ))}
    </div>
  );
}
