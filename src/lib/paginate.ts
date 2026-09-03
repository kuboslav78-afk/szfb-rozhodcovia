/**
 * PostgREST (a teda aj supabase-js) vracia na jeden dopyt najviac 1000 riadkov a
 * nijako to nesignalizuje — dopyt jednoducho vráti prvú tisícku a tvári sa, že je
 * to všetko. Pri tabuľkách, ktoré počas sezóny narastú (matches má cez 1900
 * riadkov), tak dáta ticho miznú. Tento helper prechádza výsledok po stránkach.
 *
 * Dopyt musí mať stabilné zoradenie (.order(...)), inak môže stránkovanie
 * niektoré riadky preskočiť a iné zopakovať.
 */
const PAGE_SIZE = 1000;

type PageResult<T> = {
  data: T[] | null;
  error: { message: string } | null;
};

export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<T[]> {
  const all: T[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    all.push(...rows);

    if (rows.length < PAGE_SIZE) break;
  }

  return all;
}
