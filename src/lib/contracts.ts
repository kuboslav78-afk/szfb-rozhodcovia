export const CONTRACT_TYPES = ["dobrovolnik", "szco", "ramcova"] as const;

export type ContractType = (typeof CONTRACT_TYPES)[number];

export const CONTRACT_LABELS: Record<ContractType, string> = {
  dobrovolnik: "Dobrovoľnícka",
  szco: "SZČO",
  ramcova: "Rámcová príkazná",
};

/** Dlhší popis do administrácie — komu je ktorá zmluva určená. */
export const CONTRACT_DESCRIPTIONS: Record<ContractType, string> = {
  dobrovolnik: "Dobrovoľnícka zmluva — regionálni rozhodcovia, odmena podľa sadzobníka výkazu dobrovoľníckej činnosti.",
  szco: "SZČO — rozhodca so živnosťou, fakturuje; určená hlavne pre celoštátnych, môže ju mať aj regionálny.",
  ramcova: "Rámcová príkazná zmluva — celoštátni rozhodcovia, ktorí nemôžu mať SZČO (prekážka u zamestnávateľa alebo povinnosť platiť mikroodvod).",
};

export function isContractType(value: string): value is ContractType {
  return (CONTRACT_TYPES as readonly string[]).includes(value);
}
