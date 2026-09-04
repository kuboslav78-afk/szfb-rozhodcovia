"use server";

import { createClient } from "@/lib/supabase/server";
import { collectPayouts, fillPrikaznaTemplate, monthLabelSk } from "@/lib/payouts";

async function requireSuperAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Pre túto akciu sa musíš prihlásiť.");
  }

  const { data: referee } = await supabase
    .from("referees")
    .select("role")
    .eq("id", user.id)
    .single();

  if (referee?.role !== "admin") {
    throw new Error("Výplatné podklady môže generovať len administrátor.");
  }

  return supabase;
}

export type PayoutPreviewRow = {
  fullName: string;
  matchCount: number;
  total: number;
  contractNumber: string | null;
  missing: string[];
};

/** Náhľad pred generovaním — koľko komu vyjde a čo mu chýba. */
export async function previewPayouts(month: string): Promise<PayoutPreviewRow[]> {
  const supabase = await requireSuperAdmin();
  const referees = await collectPayouts(supabase, month, "ramcova");

  return referees.map((r) => ({
    fullName: r.fullName,
    matchCount: r.matches.length,
    total: r.total,
    contractNumber: r.contractNumber,
    missing: [
      !r.contractNumber && "číslo zmluvy",
      !r.address && "adresa",
      !r.iban && "IBAN",
      r.matches.some((m) => !m.fee) && "sadzba za niektorý zápas",
      r.matches.some((m) => !m.venue) && "adresa haly",
    ].filter((x): x is string => Boolean(x)),
  }));
}

/**
 * Vyplní nahranú šablónu a vráti hotový zošit. Šablónu berieme od používateľa pri
 * každom generovaní — nikde ju neukladáme, takže sa vždy použije tá verzia, ktorú
 * má KRO práve platnú, a jeho formátovanie ostáva nedotknuté.
 */
export async function generatePrikaznaPayout(formData: FormData) {
  const supabase = await requireSuperAdmin();

  const month = String(formData.get("month") ?? "");
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new Error("Vyber mesiac.");
  }

  const file = formData.get("template");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Nahraj šablónu výkazu (.xlsx).");
  }

  const referees = await collectPayouts(supabase, month, "ramcova");
  if (referees.length === 0) {
    throw new Error(
      `Za ${monthLabelSk(month)} nemá žiadny rozhodca s rámcovou príkaznou zmluvou potvrdenú nomináciu.`,
    );
  }

  const filled = await fillPrikaznaTemplate(await file.arrayBuffer(), month, referees);

  return {
    fileName: `vykaz-prikazne-${month}.xlsx`,
    refereeCount: referees.length,
    total: referees.reduce((sum, r) => sum + r.total, 0),
    // Server action nevie vrátiť Buffer priamo do prehliadača, tak base64.
    base64: filled.toString("base64"),
  };
}
