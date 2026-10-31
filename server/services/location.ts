/**
 * Server-side reverse geocoding. Runs on the server so the Google key stays private
 * and OpenStreetMap gets the identifying User-Agent its usage policy requires.
 *
 * Resolution order: Google Geocoding (when GOOGLE_MAPS_API_KEY works) → OpenStreetMap
 * Nominatim → nearest known Pakistani city. Every result is mapped onto the shared
 * city table so the job ranker sees "Islamabad", never "Zone IV" or "Saddar".
 */
import { findKnownCity, isValidCoords, nearestKnownCity, type KnownCity } from "../../shared/pakistanCities";

export type ResolvedLocation = {
  city: string;
  cityKey: string | null;
  province: string | null;
  countryCode: string | null;
  label: string;
  formattedAddress: string;
  lat: number;
  lng: number;
  source: "google" | "openstreetmap" | "nearest-city";
};

// A GPS fix inside Pakistan that no geocoder could name is snapped to a known city only when it is this close.
const SNAP_TO_KNOWN_CITY_KM = 40;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 5_000;
const REQUEST_TIMEOUT_MS = 5_000;
const USER_AGENT = "FutureMakerAI/1.0 (job-radar location lookup)";

const cache = new Map<string, { value: ResolvedLocation; expiresAt: number }>();
let googleDisabledReason: string | null = null;

function cacheKey(lat: number, lng: number) {
  // ~1 km grid: precise enough for city resolution, coarse enough to share cache hits.
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

function fromKnownCity(city: KnownCity, lat: number, lng: number, source: ResolvedLocation["source"], formattedAddress?: string): ResolvedLocation {
  return {
    city: city.name,
    cityKey: city.key,
    province: city.province,
    countryCode: "PK",
    label: `${city.name}, Pakistan`,
    formattedAddress: formattedAddress || `${city.name}, ${city.province}, Pakistan`,
    lat,
    lng,
    source,
  };
}

/** First known city found while walking candidate address fields from most to least specific. */
function matchFields(fields: Array<string | undefined | null>): KnownCity | null {
  for (const field of fields) {
    const city = findKnownCity(field);
    if (city) return city;
  }
  return null;
}

function stripAdminSuffix(name: string) {
  return name.replace(/\s+(district|division|tehsil|city tehsil|capital territory)$/i, "").trim();
}

function resolveUnknownPlace(params: {
  lat: number;
  lng: number;
  rawCity: string | null;
  province: string | null;
  countryCode: string | null;
  countryName: string | null;
  formattedAddress: string;
  source: ResolvedLocation["source"];
}): ResolvedLocation {
  const { lat, lng, countryCode, source } = params;
  if (countryCode === "PK") {
    const nearest = nearestKnownCity(lat, lng);
    if (nearest.distanceKm <= SNAP_TO_KNOWN_CITY_KM) return fromKnownCity(nearest.city, lat, lng, source, params.formattedAddress);
  }
  const city = params.rawCity ? stripAdminSuffix(params.rawCity) : params.province || "Unknown location";
  const country = params.countryName || (countryCode === "PK" ? "Pakistan" : "");
  return {
    city,
    cityKey: null,
    province: params.province,
    countryCode,
    label: country ? `${city}, ${country}` : city,
    formattedAddress: params.formattedAddress || city,
    lat,
    lng,
    source,
  };
}

type GoogleComponent = { long_name: string; short_name: string; types: string[] };

async function reverseGeocodeWithGoogle(lat: number, lng: number): Promise<ResolvedLocation | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key || googleDisabledReason) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=en&key=${encodeURIComponent(key)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!res.ok) return null;
  const data = (await res.json()) as { status: string; error_message?: string; results?: Array<{ formatted_address: string; address_components: GoogleComponent[] }> };

  if (data.status === "REQUEST_DENIED") {
    // A misconfigured key fails every call the same way; stop retrying it until restart.
    googleDisabledReason = data.error_message || "REQUEST_DENIED";
    console.warn(`[Location] Google Geocoding disabled for this process: ${googleDisabledReason}`);
    return null;
  }
  if (data.status !== "OK" || !data.results?.length) return null;

  const components = data.results[0].address_components;
  const pick = (type: string) => components.find((c) => c.types.includes(type))?.long_name;
  const locality = pick("locality");
  const admin2 = pick("administrative_area_level_2");
  const admin3 = pick("administrative_area_level_3");
  const admin1 = pick("administrative_area_level_1");
  const country = components.find((c) => c.types.includes("country"));
  const formattedAddress = data.results[0].formatted_address;

  const known = matchFields([locality, admin3, admin2, admin1]);
  if (known) return fromKnownCity(known, lat, lng, "google", formattedAddress);

  return resolveUnknownPlace({
    lat,
    lng,
    rawCity: locality || admin3 || admin2 || null,
    province: admin1 || null,
    countryCode: country?.short_name?.toUpperCase() || null,
    countryName: country?.long_name || null,
    formattedAddress,
    source: "google",
  });
}

async function reverseGeocodeWithNominatim(lat: number, lng: number): Promise<ResolvedLocation | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Language": "en" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string; address?: Record<string, string> };
  const addr = data.address;
  if (!addr) return null;

  // Nominatim puts the city name in different fields per country/zoom (Karachi: "city",
  // Rawalpindi: "municipality", Lahore: "county", Islamabad: only "state"), so check them all.
  const known = matchFields([
    addr.city,
    addr.town,
    addr.municipality,
    addr.city_district,
    addr.county,
    addr.state_district,
    addr.state,
    addr["ISO3166-2-lvl4"],
  ]);
  const formattedAddress = data.display_name || "";
  if (known) return fromKnownCity(known, lat, lng, "openstreetmap", formattedAddress);

  return resolveUnknownPlace({
    lat,
    lng,
    rawCity: addr.city || addr.town || addr.municipality || addr.county || null,
    province: addr.state || null,
    countryCode: addr.country_code?.toUpperCase() || null,
    countryName: addr.country || null,
    formattedAddress,
    source: "openstreetmap",
  });
}

export async function reverseGeocode(lat: number, lng: number): Promise<ResolvedLocation> {
  if (!isValidCoords({ lat, lng })) throw new Error("Invalid coordinates.");

  const key = cacheKey(lat, lng);
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) return { ...hit.value, lat, lng };

  let resolved: ResolvedLocation | null = null;
  for (const provider of [reverseGeocodeWithGoogle, reverseGeocodeWithNominatim]) {
    try {
      resolved = await provider(lat, lng);
    } catch (error) {
      console.warn(`[Location] ${provider.name} failed:`, error instanceof Error ? error.message : error);
    }
    if (resolved) break;
  }

  if (!resolved) {
    // Both geocoders unreachable: use the nearest known city if it is plausibly the user's,
    // otherwise keep the raw coordinates so distance ranking still works.
    const nearest = nearestKnownCity(lat, lng);
    resolved = nearest.distanceKm <= SNAP_TO_KNOWN_CITY_KM
      ? fromKnownCity(nearest.city, lat, lng, "nearest-city")
      : resolveUnknownPlace({ lat, lng, rawCity: "Your location", province: null, countryCode: null, countryName: null, formattedAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}`, source: "nearest-city" });
  }

  // Don't cache the offline fallback: a geocoder outage should not stick for 24 hours.
  if (resolved.source !== "nearest-city") {
    if (cache.size >= CACHE_MAX_ENTRIES) cache.delete(cache.keys().next().value!);
    cache.set(key, { value: resolved, expiresAt: now + CACHE_TTL_MS });
  }
  return resolved;
}

/**
 * Startup check so a misconfigured Google key is visible in the terminal instead of silently
 * falling back to OpenStreetMap. Makes one geocoding request (Islamabad) when a key is set.
 */
export async function reportLocationServiceStatus() {
  const key = process.env.GOOGLE_MAPS_API_KEY?.trim();
  if (!key) {
    console.warn("[Location] GOOGLE_MAPS_API_KEY is not set; using OpenStreetMap to find the user's city.");
    return;
  }
  try {
    const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=33.6844,73.0479&key=${encodeURIComponent(key)}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const data = (await res.json()) as { status: string; error_message?: string };
    if (data.status === "OK") {
      console.log("[Location] Google Geocoding is working; user cities are resolved by Google.");
    } else {
      googleDisabledReason = data.error_message || data.status;
      console.warn(
        `[Location] Google Geocoding is NOT working (${data.status}): ${data.error_message ?? ""}\n` +
          "           Enable \"Geocoding API\" for this key in Google Cloud Console. Using OpenStreetMap until then."
      );
    }
  } catch (error) {
    console.warn("[Location] Could not reach Google Geocoding:", error instanceof Error ? error.message : error);
  }
}

/** Test hook: clears the cache and the "Google key is broken" latch. */
export function resetLocationServiceForTests() {
  cache.clear();
  googleDisabledReason = null;
}
