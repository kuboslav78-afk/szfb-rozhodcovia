import Link from "next/link";
import { CATEGORIES, CATEGORY_LABELS, type Category } from "@/lib/categories";

export function NominationCategoryTabs({ active }: { active: Category }) {
  return (
    <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-zinc-200 p-1 text-sm dark:border-zinc-800">
      {CATEGORIES.map((category) => (
        <Link
          key={category}
          href={`/nominations?category=${category}`}
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
