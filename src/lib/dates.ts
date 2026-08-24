const MONTH_NAMES = [
  "január",
  "február",
  "marec",
  "apríl",
  "máj",
  "jún",
  "júl",
  "august",
  "september",
  "október",
  "november",
  "december",
];

const WEEKDAY_LABELS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

export type MonthKey = { year: number; month: number };

export function parseMonthParam(value: string | undefined): MonthKey {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    const [year, month] = value.split("-").map(Number);
    if (month >= 1 && month <= 12) {
      return { year, month };
    }
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function monthParam({ year, month }: MonthKey): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function monthLabel({ year, month }: MonthKey): string {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function adjacentMonth(
  { year, month }: MonthKey,
  delta: number,
): MonthKey {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

export function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function weekdayLabels(): string[] {
  return WEEKDAY_LABELS;
}

/**
 * Vráti mriežku dní pre kalendár (vrátane null pre prázdne bunky pred
 * prvým a po poslednom dni mesiaca), týždeň začína pondelkom.
 */
export function monthGrid({ year, month }: MonthKey): (number | null)[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = (new Date(year, month - 1, 1).getDay() + 6) % 7; // 0 = pondelok

  const cells: (number | null)[] = Array(firstWeekday).fill(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

export function todayDateStr(): string {
  const now = new Date();
  return toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** Počet kalendárnych dní od dneška po zadaný dátum (môže byť záporné). */
export function daysUntil(dateStr: string): number {
  const [year, month, day] = dateStr.split("-").map(Number);
  const target = new Date(year, month - 1, day).getTime();

  const now = new Date();
  const todayMidnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  return Math.round((target - todayMidnight) / (1000 * 60 * 60 * 24));
}
