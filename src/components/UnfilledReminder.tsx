import type { Category } from "@/lib/categories";

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("sk-SK", { day: "numeric", month: "long" });
}

export function UnfilledReminder({
  dates,
  category,
}: {
  dates: string[];
  category: Category;
}) {
  if (dates.length === 0) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
        Máš {dates.length} nevyplnených {dates.length === 1 ? "termín" : "termínov"} — choď ich vyplniť.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {dates.map((date) => {
          const [year, month] = date.split("-");
          return (
            <a
              key={date}
              href={`/?month=${year}-${month}&view=moje&category=${category}`}
              className="rounded-full border border-amber-300 bg-white px-3 py-1 text-sm font-medium text-amber-800 transition hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-900 dark:text-amber-200 dark:hover:bg-amber-800"
            >
              {formatDateLabel(date)}
            </a>
          );
        })}
      </div>
    </div>
  );
}
