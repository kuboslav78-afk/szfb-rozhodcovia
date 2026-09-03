"use server";

import { createClient } from "@/lib/supabase/server";
import { sendBatchEmails, bulkAnnouncementEmailHtml } from "@/lib/email";
import type { Category } from "@/lib/categories";

async function requireSuperAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Pre túto akciu sa musíš prihlásiť.");
  }

  const { data: referee } = await supabase.from("referees").select("role").eq("id", user.id).single();

  if (referee?.role !== "admin") {
    throw new Error("Túto akciu môže vykonať len administrátor.");
  }

  return supabase;
}

export type EmailRecipient = { id: string; full_name: string; email: string; home_region: string | null };

export type RecipientFilter =
  | { mode: "all" }
  | { mode: "region"; categories: Category[] }
  | { mode: "selected"; refereeIds: string[] };

/** Zoznam rozhodcov pre daný filter — používa sa na náhľad počtu príjemcov aj na samotné odoslanie. */
export async function getEmailRecipients(filter: RecipientFilter): Promise<EmailRecipient[]> {
  const supabase = await requireSuperAdmin();

  if (filter.mode === "all") {
    const { data } = await supabase
      .from("referees")
      .select("id, full_name, email, home_region")
      .eq("active", true)
      .order("full_name");
    return data ?? [];
  }

  if (filter.mode === "selected") {
    if (filter.refereeIds.length === 0) return [];
    const { data } = await supabase
      .from("referees")
      .select("id, full_name, email, home_region")
      .in("id", filter.refereeIds)
      .eq("active", true)
      .order("full_name");
    return data ?? [];
  }

  // mode === "region"
  if (filter.categories.length === 0) return [];
  const { data: catRows } = await supabase
    .from("referee_categories")
    .select("referee_id")
    .in("category", filter.categories);

  const idSet = new Set((catRows ?? []).map((r) => r.referee_id as string));

  // Regionálni rozhodcovia si domáci región volia až pri prvom prihlásení —
  // dovtedy nemajú v referee_categories žiadny riadok vôbec, takže by inak
  // z výberu podľa regiónu úplne vypadli. Keď vyberáme aspoň jeden skutočný
  // región (nie celoštátny), pripočítame aj týchto "zatiaľ nezaradených".
  const selectingActualRegion = filter.categories.some((c) => c !== "celostatny");
  if (selectingActualRegion) {
    const [{ data: allCatRows }, { data: allActiveReferees }] = await Promise.all([
      supabase.from("referee_categories").select("referee_id"),
      supabase.from("referees").select("id").eq("active", true),
    ]);
    const anyCategoryIds = new Set((allCatRows ?? []).map((r) => r.referee_id as string));
    for (const r of allActiveReferees ?? []) {
      if (!anyCategoryIds.has(r.id)) idSet.add(r.id);
    }
  }

  const ids = Array.from(idSet);
  if (ids.length === 0) return [];

  const { data } = await supabase
    .from("referees")
    .select("id, full_name, email, home_region")
    .in("id", ids)
    .eq("active", true)
    .order("full_name");
  return data ?? [];
}

export async function listAllReferees(): Promise<EmailRecipient[]> {
  const supabase = await requireSuperAdmin();
  const { data } = await supabase
    .from("referees")
    .select("id, full_name, email, home_region")
    .eq("active", true)
    .order("full_name");
  return data ?? [];
}

/** Odošle hromadný e-mail vybranej skupine rozhodcov. */
export async function sendKroEmail(filter: RecipientFilter, subject: string, bodyText: string) {
  await requireSuperAdmin();

  if (!subject.trim() || !bodyText.trim()) {
    throw new Error("Vyplň predmet aj text správy.");
  }

  const recipients = await getEmailRecipients(filter);
  const withEmail = recipients.filter((r) => r.email);

  if (withEmail.length === 0) {
    throw new Error("Žiadny z vybraných rozhodcov nemá e-mailovú adresu.");
  }

  const emails = withEmail.map((r) => ({
    to: r.email,
    subject,
    html: bulkAnnouncementEmailHtml({ refereeName: r.full_name, bodyText }),
  }));

  const result = await sendBatchEmails(emails);
  return { total: withEmail.length, ...result };
}
