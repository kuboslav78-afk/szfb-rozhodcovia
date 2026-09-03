/**
 * Údaje, ktoré si rozhodca vypĺňa v profile sám. Jediné miesto, kde sú
 * definované — používa ich výzva na dashboarde aj prehľad údajov v administrácii,
 * takže si tie dve obrazovky nemôžu protirečiť.
 */
export const PROFILE_FIELD_LABELS = {
  phone: "telefón",
  address: "adresa",
  date_of_birth: "dátum narodenia",
  birth_number: "rodné číslo",
  bank_account: "IBAN",
  jersey_size: "veľkosť dresu",
  shorts_size: "veľkosť trenírok",
  socks_size: "veľkosť ponožiek",
} as const;

export type ProfileField = keyof typeof PROFILE_FIELD_LABELS;

export const PROFILE_FIELDS = Object.keys(PROFILE_FIELD_LABELS) as ProfileField[];

export type ProfileFieldValues = Partial<Record<ProfileField, string | null>>;

export function missingProfileFields(values: ProfileFieldValues): ProfileField[] {
  return PROFILE_FIELDS.filter((field) => !values[field]);
}

export function filledProfileFieldCount(values: ProfileFieldValues): number {
  return PROFILE_FIELDS.length - missingProfileFields(values).length;
}
