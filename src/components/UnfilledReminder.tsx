import type { Category } from "@/lib/categories";

function formatDateLabel(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("sk-SK", { day: "numeric", month: "long" });
}

export function UnfilledReminder({
  dates,
  category,
  nextMonth,
}: {
  dates: string[];
  category: Category;
  nextMonth: { monthParam: string; label: string } | null;
}) {
  if (dates.length === 0 && !nextMonth) return null;

  return (
    <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
      {dates.length > 0 && (
        <>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            Máš {dates.length} nevyplnených {dates.length === 1 ? "termín" : "termínov"} tento mesiac — choď ich vyplniť.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {dates.map((date) => (
              <span
                key={date}
                className="rounded-full border border-amber-300 bg-white px-3 py-1 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-900 dark:text-amber-200"
              >
                {formatDateLabel(date)}
              </span>
            ))}
          </div>
        </>
      )}
      {nextMonth && (
        <p
          className={`text-sm text-amber-700 dark:text-amber-400 ${dates.length > 0 ? "mt-3 border-t border-amber-200 pt-3 dark:border-amber-900" : ""}`}
        >
          Venuj pozornosť aj termínom v mesiaci{" "}
          <a
            href={`/dostupnost?month=${nextMonth.monthParam}&view=moje&category=${category}`}
            className="font-semibold underline hover:no-underline"
          >
            {nextMonth.label}
          </a>
          .
        </p>
      )}
    </div>
  );
}
