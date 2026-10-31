/**
 * Single source of truth for Pakistani city geography, shared by the server job
 * ranker and the client location/map code. Matching is done against this table
 * instead of free-text geocoder fields, which return things like "Zone IV" or
 * "Saddar" rather than the city name.
 */

export type Province = "Islamabad Capital Territory" | "Punjab" | "Sindh" | "Khyber Pakhtunkhwa" | "Balochistan" | "Azad Kashmir" | "Gilgit-Baltistan";

export type KnownCity = {
  key: string;
  name: string;
  lat: number;
  lng: number;
  province: Province;
  aliases?: string[];
};

export const DEFAULT_CITY_NAME = "Islamabad";
export const DEFAULT_LOCATION_LABEL = "Islamabad, Pakistan";

// Order matters for text matching: more specific names come before ones they contain
// (e.g. "Hyderabad" must not match inside "Islamabad", "Wah Cantt" before "Taxila").
export const PAKISTAN_CITIES: KnownCity[] = [
  { key: "islamabad", name: "Islamabad", lat: 33.6844, lng: 73.0479, province: "Islamabad Capital Territory", aliases: ["islamabad capital territory", "pk-is"] },
  { key: "rawalpindi", name: "Rawalpindi", lat: 33.5651, lng: 73.0169, province: "Punjab", aliases: ["pindi", "chaklala"] },
  { key: "wahcantt", name: "Wah Cantt", lat: 33.7715, lng: 72.7511, province: "Punjab", aliases: ["wah cantonment", "wah"] },
  { key: "taxila", name: "Taxila", lat: 33.7463, lng: 72.8397, province: "Punjab" },
  { key: "lahore", name: "Lahore", lat: 31.5204, lng: 74.3587, province: "Punjab" },
  { key: "karachi", name: "Karachi", lat: 24.8607, lng: 67.0011, province: "Sindh" },
  { key: "faisalabad", name: "Faisalabad", lat: 31.4504, lng: 73.135, province: "Punjab", aliases: ["lyallpur"] },
  { key: "peshawar", name: "Peshawar", lat: 34.0151, lng: 71.5249, province: "Khyber Pakhtunkhwa" },
  { key: "multan", name: "Multan", lat: 30.1575, lng: 71.5249, province: "Punjab" },
  { key: "quetta", name: "Quetta", lat: 30.1798, lng: 66.975, province: "Balochistan" },
  { key: "gujranwala", name: "Gujranwala", lat: 32.1877, lng: 74.1945, province: "Punjab" },
  { key: "sialkot", name: "Sialkot", lat: 32.4945, lng: 74.5229, province: "Punjab" },
  { key: "abbottabad", name: "Abbottabad", lat: 34.1688, lng: 73.2215, province: "Khyber Pakhtunkhwa" },
  { key: "hyderabad", name: "Hyderabad", lat: 25.396, lng: 68.3578, province: "Sindh" },
  { key: "bahawalpur", name: "Bahawalpur", lat: 29.3544, lng: 71.6911, province: "Punjab" },
  { key: "sargodha", name: "Sargodha", lat: 32.0836, lng: 72.6711, province: "Punjab" },
  { key: "sheikhupura", name: "Sheikhupura", lat: 31.7131, lng: 73.9783, province: "Punjab" },
  { key: "jhelum", name: "Jhelum", lat: 32.9425, lng: 73.7257, province: "Punjab" },
  { key: "gujrat", name: "Gujrat", lat: 32.5742, lng: 74.0754, province: "Punjab" },
  { key: "mardan", name: "Mardan", lat: 34.1986, lng: 72.0404, province: "Khyber Pakhtunkhwa" },
  { key: "sukkur", name: "Sukkur", lat: 27.7052, lng: 68.8574, province: "Sindh" },
  { key: "kasur", name: "Kasur", lat: 31.1179, lng: 74.4461, province: "Punjab" },
  { key: "sahiwal", name: "Sahiwal", lat: 30.6682, lng: 73.1114, province: "Punjab" },
  { key: "okara", name: "Okara", lat: 30.8081, lng: 73.4458, province: "Punjab" },
  { key: "mingora", name: "Mingora", lat: 34.7758, lng: 72.3625, province: "Khyber Pakhtunkhwa", aliases: ["swat"] },
  { key: "mirpur", name: "Mirpur", lat: 33.1437, lng: 73.7518, province: "Azad Kashmir" },
  { key: "muzaffarabad", name: "Muzaffarabad", lat: 34.3595, lng: 73.4708, province: "Azad Kashmir" },
  { key: "gilgit", name: "Gilgit", lat: 35.9208, lng: 74.3089, province: "Gilgit-Baltistan" },
];

const CITY_BY_KEY = new Map(PAKISTAN_CITIES.map((city) => [city.key, city]));

export function getCityByKey(key: string | null | undefined): KnownCity | null {
  if (!key) return null;
  return CITY_BY_KEY.get(key.toLowerCase().replace(/[^a-z]/g, "")) ?? null;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const CITY_MATCHERS = PAKISTAN_CITIES.map((city) => ({
  city,
  pattern: new RegExp(`(^|[^a-z])(${[city.name, ...(city.aliases ?? [])].map((n) => escapeRegExp(n.toLowerCase())).join("|")})([^a-z]|$)`),
}));

/** Finds the known city named anywhere in free text ("Islamabad Pakistan", "F-7, Islamabad · Hybrid"). */
export function findKnownCity(text: string | null | undefined): KnownCity | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  // Word-boundary match so "Hyderabad" never matches inside "Islamabad".
  for (const { city, pattern } of CITY_MATCHERS) {
    if (pattern.test(lower)) return city;
  }
  // Text without separators such as "islamabadpakistan".
  const compact = lower.replace(/[^a-z]/g, "");
  for (const city of PAKISTAN_CITIES) {
    if (compact.startsWith(city.key)) return city;
  }
  return null;
}

export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function nearestKnownCity(lat: number, lng: number): { city: KnownCity; distanceKm: number } {
  let best = PAKISTAN_CITIES[0];
  let bestDistance = Infinity;
  for (const city of PAKISTAN_CITIES) {
    const d = distanceKm(lat, lng, city.lat, city.lng);
    if (d < bestDistance) {
      best = city;
      bestDistance = d;
    }
  }
  return { city: best, distanceKm: bestDistance };
}

export function isValidCoords(coords: { lat: number; lng: number } | null | undefined): coords is { lat: number; lng: number } {
  return Boolean(
    coords &&
      Number.isFinite(coords.lat) &&
      Number.isFinite(coords.lng) &&
      Math.abs(coords.lat) <= 90 &&
      Math.abs(coords.lng) <= 180
  );
}

/**
 * Proximity tiers used to rank jobs. Lower is closer. A "Pakistan" job in another
 * province is deliberately ranked below a remote role rather than counted as a match.
 */
export type ProximityTier = "same-city" | "nearby" | "same-province" | "remote" | "same-country" | "elsewhere";

export const PROXIMITY_TIER_RANK: Record<ProximityTier, number> = {
  "same-city": 0,
  nearby: 1,
  "same-province": 2,
  remote: 3,
  "same-country": 4,
  elsewhere: 5,
};

export const NEARBY_RADIUS_KM = 50;

export function classifyProximity(params: {
  candidateCity: KnownCity | null;
  candidateCoords?: { lat: number; lng: number } | null;
  jobCity: KnownCity | null;
  jobCoords?: { lat: number; lng: number } | null;
  jobIsRemote: boolean;
  jobInPakistan: boolean;
}): { tier: ProximityTier; distanceKm: number | null } {
  const { candidateCity, jobCity, jobIsRemote, jobInPakistan } = params;
  const origin = isValidCoords(params.candidateCoords) ? params.candidateCoords : candidateCity;
  const target = isValidCoords(params.jobCoords) ? params.jobCoords : jobCity;
  const dist = origin && target ? distanceKm(origin.lat, origin.lng, target.lat, target.lng) : null;

  if (jobIsRemote && !jobCity) return { tier: "remote", distanceKm: null };
  if (candidateCity && jobCity && candidateCity.key === jobCity.key) return { tier: "same-city", distanceKm: dist };
  if (dist !== null && dist <= NEARBY_RADIUS_KM) return { tier: "nearby", distanceKm: dist };
  if (candidateCity && jobCity && candidateCity.province === jobCity.province) return { tier: "same-province", distanceKm: dist };
  if (jobIsRemote) return { tier: "remote", distanceKm: dist };
  if (jobInPakistan || jobCity) return { tier: "same-country", distanceKm: dist };
  return { tier: "elsewhere", distanceKm: dist };
}
