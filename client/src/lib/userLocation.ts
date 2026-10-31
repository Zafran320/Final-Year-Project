/**
 * One place that decides "where is the user" for Job Radar, the dashboard and the map.
 *
 * Order: saved choice (GPS fix < 24 h old, or a city the user picked) → fresh GPS fix
 * resolved by the server geocoder → city from the career profile → default city.
 * There is deliberately no IP-based lookup: Pakistani ISPs route through Karachi/Lahore,
 * which is how Islamabad users ended up with Karachi jobs.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEYS } from "@/lib/brand";
import { trpc } from "@/lib/trpc";
import { DEFAULT_CITY_NAME, findKnownCity, getCityByKey, type KnownCity } from "@shared/pakistanCities";

export type UserLocationSource = "gps" | "manual" | "profile" | "default";

export type UserLocation = {
  city: string;
  cityKey: string | null;
  /** "Islamabad, Pakistan" — sent to the server as the job-search location. */
  label: string;
  lat: number | null;
  lng: number | null;
  /** ISO country code ("PK"), used to search jobs in the right country. */
  countryCode: string | null;
  formattedAddress?: string;
  source: UserLocationSource;
  savedAt?: number;
};

export const GPS_LOCATION_TTL_MS = 24 * 60 * 60 * 1000;
export const MANUAL_LOCATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const LOCATION_CHANGED_EVENT = "futuremaker:location-changed";

export function locationFromCity(city: KnownCity, source: UserLocationSource): UserLocation {
  return { city: city.name, cityKey: city.key, label: `${city.name}, Pakistan`, lat: city.lat, lng: city.lng, countryCode: "PK", source };
}

/** Reads the saved location, discarding expired fixes and pre-fix entries (which may hold a wrong IP-based city). */
export function readStoredLocation(now = Date.now(), storage: Storage | null = safeStorage()): UserLocation | null {
  try {
    const raw = storage?.getItem(STORAGE_KEYS.userGeo);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserLocation>;
    if (!parsed.savedAt || !parsed.city || !parsed.label || (parsed.source !== "gps" && parsed.source !== "manual")) return null;
    const ttl = parsed.source === "gps" ? GPS_LOCATION_TTL_MS : MANUAL_LOCATION_TTL_MS;
    if (now - parsed.savedAt > ttl) return null;
    return {
      city: parsed.city,
      cityKey: parsed.cityKey ?? null,
      label: parsed.label,
      lat: typeof parsed.lat === "number" ? parsed.lat : null,
      lng: typeof parsed.lng === "number" ? parsed.lng : null,
      countryCode: parsed.countryCode ?? (parsed.cityKey ? "PK" : null),
      formattedAddress: parsed.formattedAddress,
      source: parsed.source,
      savedAt: parsed.savedAt,
    };
  } catch {
    return null;
  }
}

export function writeStoredLocation(location: UserLocation | null, storage: Storage | null = safeStorage()) {
  try {
    if (!storage) return;
    if (location) {
      storage.setItem(STORAGE_KEYS.userGeo, JSON.stringify({ ...location, savedAt: location.savedAt ?? Date.now() }));
      storage.setItem(STORAGE_KEYS.userLocation, location.city);
    } else {
      storage.removeItem(STORAGE_KEYS.userGeo);
      storage.removeItem(STORAGE_KEYS.userLocation);
    }
  } catch {
    // Storage blocked: the location still works for this page view.
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LOCATION_CHANGED_EVENT));
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Fallback when nothing has been detected or chosen: the profile's city, else the default city. */
export function fallbackLocation(profileLocation?: string | null): UserLocation {
  const profileCity = findKnownCity(profileLocation);
  if (profileCity) return locationFromCity(profileCity, "profile");
  if (profileLocation?.trim()) {
    const label = profileLocation.trim();
    return { city: label.split(",")[0].trim(), cityKey: null, label, lat: null, lng: null, countryCode: null, source: "profile" };
  }
  return locationFromCity(getCityByKey(DEFAULT_CITY_NAME)!, "default");
}

function getBrowserPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15_000,
      maximumAge: 5 * 60_000,
    });
  });
}

export type DetectStatus = "idle" | "detecting" | "denied" | "error";

// Shared across every component using the hook, so one page never asks for GPS twice
// and nobody fires a job search for the fallback city while GPS is still answering.
let sharedDetection: Promise<UserLocation | null> | null = null;
let sharedStatus: DetectStatus = "idle";
let autoDetectFinished = false;

function setSharedStatus(next: DetectStatus) {
  sharedStatus = next;
  if (typeof window !== "undefined") window.dispatchEvent(new Event(LOCATION_CHANGED_EVENT));
}

async function runDetection(reverseGeocode: (coords: { lat: number; lng: number }) => Promise<{
  city: string;
  cityKey: string | null;
  label: string;
  countryCode: string | null;
  formattedAddress: string;
}>): Promise<UserLocation | null> {
  setSharedStatus("detecting");
  let position: GeolocationPosition;
  try {
    position = await getBrowserPosition();
  } catch (error) {
    const denied = typeof error === "object" && error !== null && (error as GeolocationPositionError).code === 1;
    setSharedStatus(denied ? "denied" : "error");
    return null;
  }

  const { latitude: lat, longitude: lng } = position.coords;
  let next: UserLocation;
  try {
    const resolved = await reverseGeocode({ lat, lng });
    next = {
      city: resolved.city,
      cityKey: resolved.cityKey,
      label: resolved.label,
      lat,
      lng,
      countryCode: resolved.countryCode,
      formattedAddress: resolved.formattedAddress,
      source: "gps",
      savedAt: Date.now(),
    };
  } catch {
    // Server unreachable: still keep the real coordinates so distance ranking works.
    next = { city: "Your location", cityKey: null, label: "Your location", lat, lng, countryCode: null, source: "gps", savedAt: Date.now() };
  }
  writeStoredLocation(next);
  setSharedStatus("idle");
  return next;
}

export function useUserLocation(profileLocation?: string | null, options: { autoDetect?: boolean } = {}) {
  const { autoDetect = true } = options;
  const [stored, setStored] = useState<UserLocation | null>(() => readStoredLocation());
  const [status, setStatus] = useState<DetectStatus>(sharedStatus);
  const [autoDone, setAutoDone] = useState(autoDetectFinished);
  const reverseGeocode = trpc.location.reverseGeocode.useMutation();
  const reverseGeocodeRef = useRef(reverseGeocode.mutateAsync);
  reverseGeocodeRef.current = reverseGeocode.mutateAsync;

  // Keep every component on the page in sync when one of them changes the location.
  useEffect(() => {
    const sync = () => {
      setStored(readStoredLocation());
      setStatus(sharedStatus);
      setAutoDone(autoDetectFinished);
    };
    window.addEventListener(LOCATION_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(LOCATION_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const detect = useCallback((): Promise<UserLocation | null> => {
    sharedDetection ??= runDetection((coords) => reverseGeocodeRef.current(coords)).finally(() => {
      sharedDetection = null;
    });
    return sharedDetection;
  }, []);

  const chooseCity = useCallback((cityKey: string) => {
    const city = getCityByKey(cityKey);
    if (!city) return;
    writeStoredLocation({ ...locationFromCity(city, "manual"), savedAt: Date.now() });
  }, []);

  const clear = useCallback(() => {
    writeStoredLocation(null);
  }, []);

  useEffect(() => {
    if (!autoDetect || stored || autoDetectFinished) return;
    void detect().finally(() => {
      autoDetectFinished = true;
      setSharedStatus(sharedStatus);
    });
  }, [autoDetect, stored, detect]);

  const location = useMemo(() => stored ?? fallbackLocation(profileLocation), [stored, profileLocation]);
  // True until we know whether GPS will give a real position; callers wait before searching.
  const isResolving = status === "detecting" || (autoDetect && !stored && !autoDone);

  return { location, status, isResolving, detect, chooseCity, clear };
}
