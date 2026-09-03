import "server-only";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/paginate";

export type Coordinates = { lat: number; lng: number };

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// Nominatim (OpenStreetMap) vyžaduje max. 1 požiadavku za sekundu a vlastnú
// User-Agent hlavičku — viac na https://operations.osmfoundation.org/policies/nominatim/
const NOMINATIM_DELAY_MS = 1100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type GeocodeResult = { coords: Coordinates } | { coords: null; reason: string };

/**
 * Geokóduje textový dopyt cez Nominatim (OpenStreetMap) — bez API kľúča, ale s rate
 * limitom. Plné názvy hál (napr. s dodatkom "kategória A+") sa väčšinou nenájdu —
 * spoľahlivo funguje len samotný názov mesta/obce.
 */
async function geocodeQuery(query: string): Promise<GeocodeResult> {
  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=sk&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "portal-rozhodcov-szfb/1.0 (kucera@szfb.sk)" },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { coords: null, reason: `HTTP ${res.status}${body ? ` — ${body.slice(0, 200)}` : ""}` };
    }
    const results = (await res.json()) as { lat: string; lon: string }[];
    const first = results[0];
    if (!first) return { coords: null, reason: "adresa sa nenašla" };
    return { coords: { lat: parseFloat(first.lat), lng: parseFloat(first.lon) } };
  } catch (err) {
    return { coords: null, reason: err instanceof Error ? err.message : "neznáma chyba fetch" };
  }
}

/** Distinct haly z matches, ktoré ešte nemajú súradnice v cache. */
export async function getVenuesWithoutCoordinates(): Promise<string[]> {
  const supabase = await createClient();

  const matchVenues = await fetchAllRows<{ venue: string }>((from, to) =>
    supabase
      .from("matches")
      .select("venue")
      .not("venue", "is", null)
      .order("venue")
      .range(from, to),
  );

  const distinctVenues = Array.from(
    new Set(matchVenues.map((m) => m.venue).filter((v) => v.trim())),
  );

  const cached = await fetchAllRows<{ venue: string }>((from, to) =>
    supabase.from("venue_coordinates").select("venue").order("venue").range(from, to),
  );
  const cachedSet = new Set(cached.map((c) => c.venue));

  return distinctVenues.filter((v) => !cachedSet.has(v)).sort();
}

/**
 * Geokóduje dávku hál podľa mesta zadaného adminom (nie podľa celého názvu haly —
 * to Nominatim väčšinou nevie nájsť). Súradnice sa uložia pod pôvodný text haly,
 * nech ich vie neskôr nájsť výpočet kolízií. Max `limit` na jedno volanie kvôli
 * rate limitu Nominatim (1 req/s) a limitu behu serverless funkcie.
 */
export async function geocodeVenuesByCity(
  entries: { venue: string; city: string }[],
  limit = 8,
) {
  const supabase = await createClient();
  const batch = entries.filter((e) => e.city.trim()).slice(0, limit);

  let geocoded = 0;
  let failed = 0;
  const failureSamples: string[] = [];

  for (const { venue, city } of batch) {
    const result = await geocodeQuery(`${city.trim()}, Slovensko`);
    if (result.coords) {
      const { error } = await supabase
        .from("venue_coordinates")
        .upsert({ venue, lat: result.coords.lat, lng: result.coords.lng });
      if (error) {
        failed++;
        failureSamples.push(`${venue}: uloženie zlyhalo — ${error.message}`);
      } else {
        geocoded++;
      }
    } else {
      failed++;
      failureSamples.push(`${venue} (${city}): ${result.reason}`);
    }
    await sleep(NOMINATIM_DELAY_MS);
  }

  return {
    processed: batch.length,
    geocoded,
    failed,
    failureSamples: failureSamples.slice(0, 3),
  };
}

/** Súradnice všetkých doteraz geokódovaných hál — pre výpočet kolízií na klientovi. */
export async function getAllVenueCoordinates(): Promise<Record<string, Coordinates>> {
  const supabase = await createClient();
  const rows = await fetchAllRows<{ venue: string; lat: number; lng: number }>((from, to) =>
    supabase.from("venue_coordinates").select("venue, lat, lng").order("venue").range(from, to),
  );

  const map: Record<string, Coordinates> = {};
  for (const row of rows) {
    map[row.venue] = { lat: row.lat, lng: row.lng };
  }
  return map;
}
