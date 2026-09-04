import "server-only";
import ExcelJS from "exceljs";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchAllRows } from "@/lib/paginate";

export type PayoutMatch = {
  league: string;
  /** Stĺpec "č. k./z." — oficiálne číslo zápasu zo szfb.sk. */
  matchLabel: string;
  /** Hala aj s adresou, tak ako to chce výkaz. */
  venue: string;
  matchDate: string;
  fee: number;
};

export type PayoutReferee = {
  id: string;
  fullName: string;
  contractNumber: string | null;
  address: string | null;
  iban: string | null;
  matches: PayoutMatch[];
  total: number;
};

/**
 * Podklady pre výkaz činnosti za jeden mesiac: potvrdené nominácie rozhodcov
 * s daným typom zmluvy, aj s odmenou podľa sadzobníka a adresou haly z adresára.
 *
 * Berie len potvrdené nominácie ('confirmed') — odoslaná či zamietnutá nominácia
 * nie je odpískaný zápas a do výplaty nepatrí.
 */
export async function collectPayouts(
  supabase: SupabaseClient,
  month: string,
  contractType: "ramcova" | "szco" | "dobrovolnik",
): Promise<PayoutReferee[]> {
  const from = `${month}-01`;
  const [year, mon] = month.split("-").map(Number);
  const to = `${year}-${String(mon).padStart(2, "0")}-${new Date(year, mon, 0).getDate()}`;

  const [referees, matches, rates, venues] = await Promise.all([
    fetchAllRows<{
      id: string;
      full_name: string;
      contract_number: string | null;
      address: string | null;
      bank_account: string | null;
    }>((f, t) =>
      supabase
        .from("referees")
        .select("id, full_name, contract_number, address, bank_account")
        .eq("active", true)
        .eq("contract_type", contractType)
        .order("full_name")
        .range(f, t),
    ),
    fetchAllRows<{
      league: string;
      match_number: number | null;
      round: string | null;
      venue: string | null;
      match_date: string;
      referee1_id: string | null;
      referee1_status: string;
      referee2_id: string | null;
      referee2_status: string;
    }>((f, t) =>
      supabase
        .from("matches")
        .select(
          "league, match_number, round, venue, match_date, referee1_id, referee1_status, referee2_id, referee2_status",
        )
        .gte("match_date", from)
        .lte("match_date", to)
        .order("match_date")
        .order("id")
        .range(f, t),
    ),
    fetchAllRows<{ league: string; fee: number | null; volunteer_fee: number | null }>((f, t) =>
      supabase.from("league_rates").select("league, fee, volunteer_fee").order("league").range(f, t),
    ),
    fetchAllRows<{ name: string; match_key: string; full_address: string | null }>((f, t) =>
      supabase.from("venues").select("name, match_key, full_address").order("name").range(f, t),
    ),
  ]);

  const feeByLeague = new Map(
    rates.map((r) => [r.league, contractType === "dobrovolnik" ? r.volunteer_fee : r.fee]),
  );
  const venueByKey = new Map(venues.map((v) => [v.match_key, v]));
  const byReferee = new Map<string, PayoutReferee>(
    referees.map((r) => [
      r.id,
      {
        id: r.id,
        fullName: r.full_name,
        contractNumber: r.contract_number,
        address: r.address,
        iban: r.bank_account,
        matches: [],
        total: 0,
      },
    ]),
  );

  for (const match of matches) {
    for (const slot of [1, 2] as const) {
      const refereeId = slot === 1 ? match.referee1_id : match.referee2_id;
      const status = slot === 1 ? match.referee1_status : match.referee2_status;
      if (!refereeId || status !== "confirmed") continue;

      const referee = byReferee.get(refereeId);
      if (!referee) continue;

      const fee = feeByLeague.get(match.league) ?? 0;
      const directory = match.venue ? venueByKey.get(venueMatchKeyLocal(match.venue)) : undefined;

      referee.matches.push({
        league: match.league,
        matchLabel: match.match_number != null ? String(match.match_number) : (match.round ?? ""),
        // Vo výkaze je hala aj s adresou; keď ju v adresári nemáme, aspoň názov.
        venue: directory?.full_address
          ? `${directory.name.replace(/\s*"kateg[oó]ria[^"]*"\s*$/i, "").trim()}, ${directory.full_address}`
          : (match.venue ?? ""),
        matchDate: match.match_date,
        fee: Number(fee),
      });
      referee.total += Number(fee);
    }
  }

  return Array.from(byReferee.values())
    .filter((r) => r.matches.length > 0)
    .map((r) => ({
      ...r,
      matches: r.matches.sort((a, b) => a.matchDate.localeCompare(b.matchDate)),
    }));
}

/** Rovnaká normalizácia ako v szfb-venues, len bez importu server-only modulu. */
function venueMatchKeyLocal(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/["'„“”]/g, "")
    .replace(/kateg[oó]ria\s*\S+/i, "")
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const MONTH_NAMES = [
  "január", "február", "marec", "apríl", "máj", "jún",
  "júl", "august", "september", "október", "november", "december",
];

export function monthLabelSk(month: string): string {
  const [year, mon] = month.split("-").map(Number);
  return `${MONTH_NAMES[mon - 1]} ${year}`;
}

/** Dátum v tvare, aký má šablóna v stĺpci F (napr. 9/6/26). */
function excelDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  return `${month}/${day}/${String(year).slice(2)}`;
}

const MATCH_ROWS = 22;

/**
 * Vyplní šablónu výkazu činnosti. Zapisuje len do buniek s údajmi — štýly,
 * vzorce (súčty SUM), obrázky ani rozloženie sa nechávajú tak, ako ich má
 * pripravené KRO, takže výsledok vyzerá presne ako doterajší ručný formulár.
 */
export async function fillPrikaznaTemplate(
  template: ArrayBuffer,
  month: string,
  referees: PayoutReferee[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(template);

  const sheet =
    workbook.getWorksheet("PZ - formuláre") ??
    workbook.worksheets.find((w) => w.name.toLowerCase().includes("formul"));

  if (!sheet) {
    throw new Error('V šablóne chýba hárok "PZ - formuláre".');
  }

  const monthLabel = monthLabelSk(month);

  // Bloky idú po 32 riadkoch a začínajú riadkom "Výkaz činnosti".
  const blockStarts: number[] = [];
  sheet.eachRow((row, number) => {
    const value = row.getCell(1).value;
    const text = typeof value === "object" && value && "richText" in value
      ? (value.richText as { text: string }[]).map((t) => t.text).join("")
      : String(value ?? "");
    if (text.includes("Výkaz činnosti")) blockStarts.push(number);
  });

  if (referees.length > blockStarts.length) {
    throw new Error(
      `Šablóna má ${blockStarts.length} formulárov, ale rozhodcov na výplatu je ${referees.length}. Doplň do šablóny ďalšie formuláre.`,
    );
  }

  referees.forEach((referee, index) => {
    const start = blockStarts[index];

    // Vzor fontov berieme z prvého bloku — jediného, ktorý má KRO naformátovaný
    // tak, ako vyzerajú ručne vyplnené výkazy. Ostatné bloky majú všade desiatku.
    normaliseRowFonts(sheet, start, blockStarts[0] + 6);

    sheet.getCell(`A${start + 1}`).value = `Mesiac: ${monthLabel}`;
    sheet.getCell(`D${start + 2}`).value = referee.contractNumber ?? "";
    sheet.getCell(`A${start + 3}`).value = `Meno a priezvisko: ${referee.fullName}`;

    for (let i = 0; i < MATCH_ROWS; i++) {
      const rowNumber = start + 6 + i;
      const match = referee.matches[i];

      if (!match) {
        // Vyčisti ukážkové hodnoty, ktoré sú v prázdnej šablóne predvyplnené.
        for (const col of ["B", "C", "D", "E", "F", "H", "J"]) {
          sheet.getCell(`${col}${rowNumber}`).value = null;
        }
        continue;
      }

      sheet.getCell(`B${rowNumber}`).value = match.league;
      sheet.getCell(`C${rowNumber}`).value = match.matchLabel;
      sheet.getCell(`D${rowNumber}`).value = referee.address ?? "";
      sheet.getCell(`E${rowNumber}`).value = match.venue;
      sheet.getCell(`F${rowNumber}`).value = excelDate(match.matchDate);
      sheet.getCell(`H${rowNumber}`).value = match.fee;
      // Rovnaký vzorec, aký má šablóna v prvom riadku — nech sedí aj po prepočte.
      sheet.getCell(`J${rowNumber}`).value = {
        formula: `SUM(H${rowNumber}:I${rowNumber})`,
        result: match.fee,
      } as ExcelJS.CellFormulaValue;
    }

    // "spolu" má v šablóne vzorec, ale uložený výsledok buď chýba, alebo je
    // z pôvodnej ukážky. "celkom" nemá vzorec vôbec — doplníme oboje, nech
    // súčet sedí aj predtým, než Excel prepočíta.
    const sumRow = start + 28;
    const totalRow = start + 29;

    sheet.getCell(`J${sumRow}`).value = {
      formula: `SUM(J${start + 6}:J${start + 27})`,
      result: referee.total,
    } as ExcelJS.CellFormulaValue;

    sheet.getCell(`J${totalRow}`).value = {
      formula: `J${sumRow}`,
      result: referee.total,
    } as ExcelJS.CellFormulaValue;
  });

  fillBulkOrder(workbook, month, referees);
  keepOnlyOutputSheets(workbook);

  // Excel si má vzorce prepočítať hneď po otvorení — inak by ukazoval hodnoty
  // uložené v šablóne, ktoré s novými dátami nemajú nič spoločné.
  workbook.calcProperties.fullCalcOnLoad = true;

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Hotová výplata má obsahovať len dva hárky — formuláre rozhodcov a hromadný
 * príkaz. Zvyšok šablóny (vzory, cenníky, výkazy jednotlivých súťaží) je pracovná
 * pomôcka KRO a do odovzdávaného súboru nepatrí.
 */
function keepOnlyOutputSheets(workbook: ExcelJS.Workbook) {
  const keep = (name: string) => {
    const lower = name.toLowerCase();
    return lower.includes("formul") || lower.includes("hromadn");
  };

  for (const sheet of [...workbook.worksheets]) {
    if (!keep(sheet.name)) workbook.removeWorksheet(sheet.id);
  }
}

/**
 * Prázdna šablóna má správne veľkosti písma len v prvom riadku prvého bloku —
 * inde majú stĺpce s adresou rozhodcu a halou desiatku namiesto osmičky. V ručne
 * vyplnených výkazoch (hárok "PZ VZOR") má každý vyplnený riadok font ako ten
 * jeden, tak ho prenesieme na všetky riadky všetkých blokov.
 *
 * Rámčekov sa nedotýkame — tie sú v šablóne správne, prvý riadok má zámerne
 * hrubšiu hornú čiaru pod hlavičkou.
 */
function normaliseRowFonts(
  sheet: ExcelJS.Worksheet,
  blockStart: number,
  sourceRow: number,
) {
  const firstMatchRow = blockStart + 6;

  for (const column of ["B", "C", "D", "E", "F", "G", "H", "I", "J"]) {
    const source = sheet.getCell(`${column}${sourceRow}`).font;
    if (!source) continue;

    for (let i = 0; i < MATCH_ROWS; i++) {
      sheet.getCell(`${column}${firstMatchRow + i}`).font = { ...source };
    }
  }
}

/**
 * Hromadný príkaz do banky. Variabilný symbol je číslo zmluvy, špecifický symbol
 * mesiac a rok — v šablóne je predvyplnený za september 2026, tak ho prepisujeme
 * podľa vybraného mesiaca. Konštantný symbol (0308) šablóna drží sama.
 */
function fillBulkOrder(
  workbook: ExcelJS.Workbook,
  month: string,
  referees: PayoutReferee[],
) {
  const sheet = workbook.worksheets.find((w) => w.name.toLowerCase().includes("hromadn"));
  if (!sheet) return;

  const [year, mon] = month.split("-").map(Number);
  const specificSymbol = `${mon}${year}`;

  sheet.getCell("C2").value = ` mesiac a rok: ${monthLabelSk(month)}`;

  const FIRST_ROW = 5;
  referees.forEach((referee, index) => {
    const row = FIRST_ROW + index;
    sheet.getCell(`B${row}`).value = referee.fullName;
    sheet.getCell(`C${row}`).value = referee.iban ?? "";
    sheet.getCell(`D${row}`).value = referee.contractNumber ?? "";
    sheet.getCell(`F${row}`).value = specificSymbol;
    sheet.getCell(`G${row}`).value = referee.total;
  });
}
