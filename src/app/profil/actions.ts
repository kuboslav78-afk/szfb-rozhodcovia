"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileDetailsInput = {
  phone: string;
  address: string;
  dateOfBirth: string; // YYYY-MM-DD alebo ""
  birthNumber: string;
  bankAccount: string;
  jerseySize: string;
  shortsSize: string;
  socksSize: string;
};

async function requireSelf() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Pre túto akciu sa musíš prihlásiť.");
  }

  return { supabase, userId: user.id };
}

export async function updateMyProfile(input: ProfileDetailsInput) {
  const { supabase, userId } = await requireSelf();

  const { error } = await supabase
    .from("referees")
    .update({
      phone: input.phone.trim() || null,
      address: input.address.trim() || null,
      date_of_birth: input.dateOfBirth || null,
      birth_number: input.birthNumber.trim() || null,
      bank_account: input.bankAccount.trim() || null,
      jersey_size: input.jerseySize.trim() || null,
      shorts_size: input.shortsSize.trim() || null,
      socks_size: input.socksSize.trim() || null,
    })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/profil");
}

export async function setPhotoPath(path: string) {
  const { supabase, userId } = await requireSelf();

  if (!path.startsWith(`${userId}/`)) {
    throw new Error("Neplatná cesta k súboru.");
  }

  const { error } = await supabase.from("referees").update({ photo_path: path }).eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/profil");
}

export async function setCriminalRecordPath(path: string) {
  const { supabase, userId } = await requireSelf();

  if (!path.startsWith(`${userId}/`)) {
    throw new Error("Neplatná cesta k súboru.");
  }

  const { error } = await supabase
    .from("referees")
    .update({ criminal_record_path: path, criminal_record_uploaded_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/profil");
}
