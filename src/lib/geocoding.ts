import "server-only";
import { createClient } from "@/lib/supabase/server";

export type Coordinates = { lat: number; lng: number };

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// Nominatim (OpenStreetMap) vyžaduje max. 1 požiadavku za sekundu a vlastnú
// User-Agent hlavičku — viac na https://operations.osmfoundation.org/policies/nominatim/
const NOMINATIM_DELAY_MS = 1100;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Skúsi geokódovať adresu haly cez Nominatim (OpenStreetMap) — bez API kľúča, ale s rate limitom. */
async function geocodeVenue(venue: string): Promise<Coordinates | null> {
  const query = `${venue}, Slovensko`;
  const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=sk&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "portal-rozhodcov-szfb/1.0 (kucera@szfb.sk)" },
    });
    if (!res.ok) return null;
    const results = (await res.json()) as { lat: string; lon: string }[];
    const first = results[0];
    if (!first) return null;
    return { lat: parseFloat(first.lat), lng: parseFloat(first.lon) };
  } catch {
    return null;
  }
}

/**
 * Geokóduje dávku hál, ktoré ešte nemajú súradnice v cache (max `limit` na jedno
 * volanie — Nominatim dovoľuje len 1 req/s, takže veľká dávka by presiahla
 * limity serverless funkcie). Volaj opakovane, kým `remaining` nie je 0.
 */
export async function geocodeVenuesBatch(limit = 8) {
  const supabase = await createClient();

  const { data: matchVenues } = await supabase
    .from("matches")
    .select("venue")
    .not("venue", "is", null);

  const distinctVenues = Array.from(
    new Set((matchVenues ?? []).map((m) => m.venue as string).filter((v) => v.trim())),
  );

  const { data: cached } = await supabase.from("venue_coordinates").select("venue");
  const cachedSet = new Set((cached ?? []).map((c) => c.venue));

  const missing = distinctVenues.filter((v) => !cachedSet.has(v));
  const batch = missing.slice(0, limit);

  let geocoded = 0;
  let failed = 0;

  for (const venue of batch) {
    const coords = await geocodeVenue(venue);
    if (coords) {
      await supabase.from("venue_coordinates").upsert({ venue, lat: coords.lat, lng: coords.lng });
      geocoded++;
    } else {
      failed++;
    }
    await sleep(NOMINATIM_DELAY_MS);
  }

  return {
    processed: batch.length,
    geocoded,
    failed,
    remaining: missing.length - batch.length,
    totalVenues: distinctVenues.length,
  };
}

/** Súradnice všetkých doteraz geokódovaných hál — pre výpočet kolízií na klientovi. */
export async function getAllVenueCoordinates(): Promise<Record<string, Coordinates>> {
  const supabase = await createClient();
  const { data } = await supabase.from("venue_coordinates").select("venue, lat, lng");
  const map: Record<string, Coordinates> = {};
  for (const row of data ?? []) {
    map[row.venue] = { lat: row.lat, lng: row.lng };
  }
  return map;
}
