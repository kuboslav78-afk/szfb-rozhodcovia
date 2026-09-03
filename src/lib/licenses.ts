export const LICENSE_LEVELS = ["N", "C", "B"] as const;

export type LicenseLevel = (typeof LICENSE_LEVELS)[number];

export const LICENSE_LABELS: Record<LicenseLevel, string> = {
  N: "Nováčik (v príprave)",
  C: "1. kvalifikačný stupeň (regionálny)",
  B: "Celoštátny",
};

export function isLicenseLevel(value: string): value is LicenseLevel {
  return (LICENSE_LEVELS as readonly string[]).includes(value);
}

/** Skúsi rozpoznať licenčný stupeň z voľného textu (napr. z importovanej Excel tabuľky). */
export function guessLicenseFromLabel(raw: string): LicenseLevel | null {
  const normalized = raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();

  if (!normalized || normalized === "ziadny" || normalized === "ziadna" || normalized === "-") {
    return null;
  }
  if (isLicenseLevel(normalized.toUpperCase())) {
    return normalized.toUpperCase() as LicenseLevel;
  }

  // "Licencia N (nováčik)", "Licencia C (obnovenie licencie)", "Licencia B ..." a pod.
  const letterMatch = normalized.match(/licenci[au]\s+([ncb])\b/);
  if (letterMatch && isLicenseLevel(letterMatch[1].toUpperCase())) {
    return letterMatch[1].toUpperCase() as LicenseLevel;
  }

  if (normalized.includes("celostat")) return "B";
  if (normalized.includes("regional") || normalized.includes("kvalifikacn")) return "C";
  if (normalized.includes("novacik")) return "N";
  return null;
}
