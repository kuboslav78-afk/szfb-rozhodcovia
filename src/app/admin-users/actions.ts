"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { isRegion, type Category, type Region } from "@/lib/categories";
import type { LicenseLevel } from "@/lib/licenses";
import type { ContractType } from "@/lib/contracts";

function slugify(part: string) {
  return part
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "");
}

function defaultPassword(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  const firstName = parts[0] ?? "";
  const lastName = parts.slice(1).join("") || firstName;
  return `${slugify(lastName)}.${slugify(firstName)}`;
}

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
    throw new Error("Túto akciu môže vykonať len administrátor.");
  }

  return user;
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    throw new Error("Chýba konfigurácia Supabase service role kľúča na serveri.");
  }

  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type CreateRefereeInput = {
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  license: LicenseLevel | null;
  participateCategories: Category[];
  adminCategories: Category[];
};

async function createOneReferee(
  admin: ReturnType<typeof serviceClient>,
  input: CreateRefereeInput,
) {
  const password = defaultPassword(input.fullName);

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Účet sa nepodarilo vytvoriť.");

  if (input.phone || input.address || input.license) {
    await admin
      .from("referees")
      .update({
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.address ? { address: input.address } : {}),
        ...(input.license ? { license_level: input.license } : {}),
      })
      .eq("id", data.user.id);
  }

  for (const category of input.participateCategories) {
    await admin
      .from("referee_categories")
      .upsert({ referee_id: data.user.id, category }, { onConflict: "referee_id,category" });
  }

  for (const category of input.adminCategories) {
    await admin
      .from("category_admins")
      .upsert({ referee_id: data.user.id, category }, { onConflict: "referee_id,category" });
  }

  return { password };
}

export async function createReferee(input: CreateRefereeInput) {
  await requireSuperAdmin();
  const admin = serviceClient();
  const result = await createOneReferee(admin, input);
  revalidatePath("/");
  return result;
}

export type BulkRefereeRow = {
  fullName: string;
  email: string;
  phone: string | null;
  address: string | null;
  license: LicenseLevel | null;
};

export type BulkImportResult = {
  fullName: string;
  email: string;
  success: boolean;
  password?: string;
  error?: string;
};

/** Hromadné vytvorenie účtov z importovanej tabuľky — pokračuje aj po chybe na jednotlivom riadku. */
export async function createRefereesBulk(
  rows: BulkRefereeRow[],
  category: Category | null,
): Promise<BulkImportResult[]> {
  await requireSuperAdmin();
  const admin = serviceClient();

  const results: BulkImportResult[] = [];
  for (const row of rows) {
    try {
      const { password } = await createOneReferee(admin, {
        fullName: row.fullName,
        email: row.email,
        phone: row.phone,
        address: row.address,
        license: row.license,
        participateCategories: category ? [category] : [],
        adminCategories: [],
      });
      results.push({ fullName: row.fullName, email: row.email, success: true, password });
    } catch (err) {
      results.push({
        fullName: row.fullName,
        email: row.email,
        success: false,
        error: err instanceof Error ? err.message : "Neznáma chyba.",
      });
    }
  }

  revalidatePath("/");
  return results;
}

export async function updateRefereeName(refereeId: string, fullName: string) {
  await requireSuperAdmin();

  const trimmed = fullName.trim();
  if (!trimmed) {
    throw new Error("Meno nemôže byť prázdne.");
  }

  const admin = serviceClient();
  const { error } = await admin
    .from("referees")
    .update({ full_name: trimmed })
    .eq("id", refereeId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
}

/** Typ zmluvy a jej číslo — číslo prideľuje ekonomický úsek SZFB. */
export async function updateRefereeContract(
  refereeId: string,
  contractType: ContractType | null,
  contractNumber: string | null,
) {
  await requireSuperAdmin();

  const admin = serviceClient();
  const { error } = await admin
    .from("referees")
    .update({
      contract_type: contractType,
      contract_number: contractNumber?.trim() || null,
    })
    .eq("id", refereeId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
}

export async function updateRefereeLicense(
  refereeId: string,
  license: LicenseLevel | null,
) {
  await requireSuperAdmin();

  const admin = serviceClient();
  const { error } = await admin
    .from("referees")
    .update({ license_level: license })
    .eq("id", refereeId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
}

/** Rozhodca si pri prvom prihlásení sám zvolí domáci región — len raz, kým je null. */
export async function chooseHomeRegion(region: Region) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Pre túto akciu sa musíš prihlásiť.");
  }

  if (!isRegion(region)) {
    throw new Error("Neplatný región.");
  }

  const { data: existing } = await supabase
    .from("referees")
    .select("home_region")
    .eq("id", user.id)
    .single();

  if (existing?.home_region) {
    throw new Error(
      "Domáci región už máš nastavený — zmenu môže urobiť len administrátor.",
    );
  }

  const { error: updateError } = await supabase
    .from("referees")
    .update({ home_region: region })
    .eq("id", user.id);

  if (updateError) throw new Error(updateError.message);

  const { error: categoryError } = await supabase
    .from("referee_categories")
    .upsert(
      { referee_id: user.id, category: region },
      { onConflict: "referee_id,category" },
    );

  if (categoryError) throw new Error(categoryError.message);

  revalidatePath("/");
}

/**
 * Admin vie kedykoľvek zmeniť/zrušiť domáci región ktoréhokoľvek rozhodcu.
 * "celostatny" je tu len informatívna hodnota pre celoštátnych rozhodcov —
 * nespúšťa (na rozdiel od skutočného regiónu) automatické zaradenie do kategórie,
 * keďže tí ju už majú udelenú samostatne.
 */
export async function adminSetHomeRegion(
  refereeId: string,
  region: Category | null,
) {
  await requireSuperAdmin();

  const admin = serviceClient();
  const { error } = await admin
    .from("referees")
    .update({ home_region: region })
    .eq("id", refereeId);

  if (error) throw new Error(error.message);

  if (region && isRegion(region)) {
    await admin
      .from("referee_categories")
      .upsert(
        { referee_id: refereeId, category: region },
        { onConflict: "referee_id,category" },
      );
  }

  revalidatePath("/");
}

/**
 * Admin vie nastaviť rolu rozhodcu — bežný rozhodca, len prehľadový "viewer"
 * (vidí všetky kategórie, nič neupraví), alebo plnohodnotný Super Admin.
 * Ide o jeden prepínač (nie nezávislé checkboxy), keďže tieto tri stavy sa
 * navzájom vylučujú.
 */
export async function setRefereeRole(
  refereeId: string,
  role: "referee" | "viewer" | "admin",
) {
  await requireSuperAdmin();

  const admin = serviceClient();
  const { error } = await admin
    .from("referees")
    .update({ role })
    .eq("id", refereeId);

  if (error) throw new Error(error.message);

  revalidatePath("/");
}

/**
 * Úroveň administratívneho prístupu ku kategórii:
 *   "none" — žiadny, "view" — len nahliadnutie (člen KRO), "edit" — plné admin práva.
 */
export type CategoryAccessLevel = "none" | "view" | "edit";

export async function setCategoryAccess(
  refereeId: string,
  category: Category,
  level: CategoryAccessLevel,
) {
  await requireSuperAdmin();

  const admin = serviceClient();

  if (level === "none") {
    const { error } = await admin
      .from("category_admins")
      .delete()
      .eq("referee_id", refereeId)
      .eq("category", category);

    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin
      .from("category_admins")
      .upsert(
        { referee_id: refereeId, category, can_edit: level === "edit" },
        { onConflict: "referee_id,category" },
      );

    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
}
