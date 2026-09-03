import type { SupabaseClient } from "@supabase/supabase-js";
import { CATEGORIES, type Category } from "@/lib/categories";

/**
 * Administratívny prístup ku kategóriám. Super admin (referees.role = 'admin') má
 * plný prístup ku všetkým; ostatní ho majú cez riadky v category_admins, kde
 * can_edit rozlišuje plné admin práva od nahliadacieho prístupu (napr. člen KRO).
 */
export type CategoryAccess = {
  /** Kategórie, ktoré používateľ vidí — vrátane tých len na čítanie. */
  visible: Category[];
  /** Podmnožina `visible`, v ktorej smie aj upravovať. */
  editable: Category[];
};

export const NO_CATEGORY_ACCESS: CategoryAccess = { visible: [], editable: [] };

export function canEditCategory(access: CategoryAccess, category: Category): boolean {
  return access.editable.includes(category);
}

export function hasAnyCategoryAccess(access: CategoryAccess): boolean {
  return access.visible.length > 0;
}

/**
 * Načíta kategóriový prístup prihláseného používateľa. Super admin obchádza
 * category_admins úplne — má všetko a s plnými právami.
 */
export async function getCategoryAccess(
  supabase: SupabaseClient,
  refereeId: string,
  isSuperAdmin: boolean,
): Promise<CategoryAccess> {
  if (isSuperAdmin) {
    return { visible: [...CATEGORIES], editable: [...CATEGORIES] };
  }

  const { data } = await supabase
    .from("category_admins")
    .select("category, can_edit")
    .eq("referee_id", refereeId);

  const rows = data ?? [];

  return {
    visible: rows.map((r) => r.category as Category),
    editable: rows.filter((r) => r.can_edit).map((r) => r.category as Category),
  };
}
