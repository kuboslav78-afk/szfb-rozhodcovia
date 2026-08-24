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
