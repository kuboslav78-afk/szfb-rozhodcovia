"use server";

import { revalidatePath } from "next/cache";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Category } from "@/lib/categories";
import type { LicenseLevel } from "@/lib/licenses";

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

export async function createReferee(input: {
  fullName: string;
  email: string;
  phone: string | null;
  license: LicenseLevel | null;
  participateCategories: Category[];
  adminCategories: Category[];
}) {
  await requireSuperAdmin();

  const admin = serviceClient();
  const password = defaultPassword(input.fullName);

  const { data, error } = await admin.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
    user_metadata: { full_name: input.fullName },
  });

  if (error) throw new Error(error.message);
  if (!data.user) throw new Error("Účet sa nepodarilo vytvoriť.");

  if (input.phone || input.license) {
    await admin
      .from("referees")
      .update({
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.license ? { license_level: input.license } : {}),
      })
      .eq("id", data.user.id);
  }

  const participate = input.participateCategories.length > 0
    ? input.participateCategories
    : (["celostatny"] as Category[]);

  for (const category of participate) {
    await admin
      .from("referee_categories")
      .upsert({ referee_id: data.user.id, category }, { onConflict: "referee_id,category" });
  }

  for (const category of input.adminCategories) {
    await admin
      .from("category_admins")
      .upsert({ referee_id: data.user.id, category }, { onConflict: "referee_id,category" });
  }

  revalidatePath("/");

  return { password };
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

export async function setCategoryAdmin(
  refereeId: string,
  category: Category,
  enabled: boolean,
) {
  await requireSuperAdmin();

  const admin = serviceClient();

  if (enabled) {
    const { error } = await admin
      .from("category_admins")
      .upsert(
        { referee_id: refereeId, category },
        { onConflict: "referee_id,category" },
      );

    if (error) throw new Error(error.message);
  } else {
    const { error } = await admin
      .from("category_admins")
      .delete()
      .eq("referee_id", refereeId)
      .eq("category", category);

    if (error) throw new Error(error.message);
  }

  revalidatePath("/");
}
