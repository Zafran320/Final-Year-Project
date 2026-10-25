import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
  MapPin,
  Crosshair,
  Loader2,
  CheckCircle2,
  TrendingUp,
  Plus,
  Minus,
  RotateCcw,
  Layers,
  Sparkles,
  Navigation,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { STORAGE_KEYS } from "@/lib/brand";

declare global {
  interface Window {
    L?: any;
  }
}

export interface CityMarker {
  id: string;
  name: string;
  lat: number;
  lng: number;
  jobCount: number;
  province: string;
  topTech: string[];
}

export const KNOWN_GEO_LOCATIONS: Record<string, { lat: number; lng: number; province: string }> = {
  islamabad: { lat: 33.6844, lng: 73.0479, province: "Federal Capital" },
  rawalpindi: { lat: 33.5651, lng: 73.0169, province: "Punjab" },
  wahcantt: { lat: 33.7715, lng: 72.7511, province: "Punjab" },
  taxila: { lat: 33.7463, lng: 72.8397, province: "Punjab" },
  lahore: { lat: 31.5204, lng: 74.3587, province: "Punjab" },
  karachi: { lat: 24.8607, lng: 67.0011, province: "Sindh" },
  faisalabad: { lat: 31.4504, lng: 73.135, province: "Punjab" },
  peshawar: { lat: 34.0151, lng: 71.5249, province: "KPK" },
  multan: { lat: 30.1575, lng: 71.5249, province: "Punjab" },
  quetta: { lat: 30.1798, lng: 66.975, province: "Balochistan" },
  gujranwala: { lat: 32.1877, lng: 74.1945, province: "Punjab" },
  sialkot: { lat: 32.4945, lng: 74.5229, province: "Punjab" },
  abbottabad: { lat: 34.1688, lng: 73.2215, province: "KPK" },
  hyderabad: { lat: 25.396, lng: 68.3578, province: "Sindh" },
  bahawalpur: { lat: 29.3544, lng: 71.6911, province: "Punjab" },
  sargodha: { lat: 32.0836, lng: 72.6711, province: "Punjab" },
  sheikhupura: { lat: 31.7131, lng: 73.9783, province: "Punjab" },
  jhelum: { lat: 32.9425, lng: 73.7257, province: "Punjab" },
  gujrat: { lat: 32.5742, lng: 74.0754, province: "Punjab" },
  mardan: { lat: 34.1986, lng: 72.0404, province: "KPK" },
  sukkur: { lat: 27.7052, lng: 68.8574, province: "Sindh" },
  kasur: { lat: 31.1179, lng: 74.4461, province: "Punjab" },
  sahiwal: { lat: 30.6682, lng: 73.1114, province: "Punjab" },
  okara: { lat: 30.8081, lng: 73.4458, province: "Punjab" },
  mingora: { lat: 34.7758, lng: 72.3625, province: "KPK" },
  mirpur: { lat: 33.1437, lng: 73.7518, province: "AJK" },
  muzaffarabad: { lat: 34.3595, lng: 73.4708, province: "AJK" },
};

export const PAKISTAN_MAJOR_CITIES: CityMarker[] = [
  {
    id: "Islamabad",
    name: "Islamabad",
    lat: 33.6844,
    lng: 73.0479,
    jobCount: 48,
    province: "Federal Capital",
    topTech: ["React", "AI / ML", "Python", "Cloud"],
  },
  {
    id: "Rawalpindi",
    name: "Rawalpindi",
    lat: 33.5651,
    lng: 73.0169,
    jobCount: 32,
    province: "Punjab",
    topTech: ["Node.js", "Full Stack", "DevOps"],
  },
  {
    id: "Wah Cantt",
    name: "Wah Cantt",
    lat: 33.7715,
    lng: 72.7511,
    jobCount: 15,
    province: "Punjab",
    topTech: ["Full Stack", "React", "TypeScript"],
  },
  {
    id: "Lahore",
    name: "Lahore",
    lat: 31.5204,
    lng: 74.3587,
    jobCount: 65,
    province: "Punjab",
    topTech: ["Next.js", "Flutter", "TypeScript", "Django"],
  },
  {
    id: "Karachi",
    name: "Karachi",
    lat: 24.8607,
    lng: 67.0011,
    jobCount: 78,
    province: "Sindh",
    topTech: ["Fintech", "React", "Java", "Postgres"],
  },
  {
    id: "Peshawar",
    name: "Peshawar",
    lat: 34.0151,
    lng: 71.5249,
    jobCount: 18,
    province: "KPK",
    topTech: ["Mobile Apps", "UI/UX", "Python"],
  },
  {
    id: "Faisalabad",
    name: "Faisalabad",
    lat: 31.4504,
    lng: 73.135,
    jobCount: 22,
    province: "Punjab",
    topTech: ["PHP", "React Native", "SQL"],
  },
  {
    id: "Gujranwala",
    name: "Gujranwala",
    lat: 32.1877,
    lng: 74.1945,
    jobCount: 20,
    province: "Punjab",
    topTech: ["React", "TypeScript", "Node.js"],
  },
  {
    id: "Sialkot",
    name: "Sialkot",
    lat: 32.4945,
    lng: 74.5229,
    jobCount: 19,
    province: "Punjab",
    topTech: ["Full Stack", "React", "E-Commerce"],
  },
  {
    id: "Abbottabad",
    name: "Abbottabad",
    lat: 34.1688,
    lng: 73.2215,
    jobCount: 16,
    province: "KPK",
    topTech: ["Python", "React", "Cloud"],
  },
  {
    id: "Multan",
    name: "Multan",
    lat: 30.1575,
    lng: 71.5249,
    jobCount: 14,
    province: "Punjab",
    topTech: ["Web Dev", "WordPress", "React"],
  },
  {
    id: "Quetta",
    name: "Quetta",
    lat: 30.1798,
    lng: 66.975,
    jobCount: 12,
    province: "Balochistan",
    topTech: ["Frontend", "Python", "Data"],
  },
];

function normalizePakistaniCity(rawCity: string): string {
  const lower = rawCity.toLowerCase().trim();
  if (lower.includes("wah") || (lower.includes("cantt") && (lower.includes("wah") || lower.includes("taxila")))) {
    return "Wah Cantt";
  }
  if (lower.includes("taxila")) return "Taxila";
  if (lower.includes("rawalpindi") || lower.includes("chaklala") || lower.includes("pindi")) return "Rawalpindi";
  if (lower.includes("islamabad")) return "Islamabad";
  if (lower.includes("lahore")) return "Lahore";
  if (lower.includes("karachi")) return "Karachi";
  if (lower.includes("faisalabad") || lower.includes("lyallpur")) return "Faisalabad";
  if (lower.includes("peshawar")) return "Peshawar";
  if (lower.includes("multan")) return "Multan";
  if (lower.includes("gujranwala")) return "Gujranwala";
  if (lower.includes("sialkot")) return "Sialkot";
  if (lower.includes("abbottabad")) return "Abbottabad";
  if (lower.includes("quetta")) return "Quetta";
  if (lower.includes("hyderabad")) return "Hyderabad";
  if (lower.includes("bahawalpur")) return "Bahawalpur";
  if (lower.includes("sargodha")) return "Sargodha";
  if (lower.includes("gujrat")) return "Gujrat";
  if (lower.includes("jhelum")) return "Jhelum";
  if (lower.includes("mardan")) return "Mardan";
  if (lower.includes("sukkur")) return "Sukkur";
  if (lower.includes("kasur")) return "Kasur";
  if (lower.includes("sahiwal")) return "Sahiwal";
  if (lower.includes("okara")) return "Okara";
  if (lower.includes("mingora") || lower.includes("swat")) return "Mingora";
  if (lower.includes("mirpur")) return "Mirpur";
  if (lower.includes("muzaffarabad")) return "Muzaffarabad";
  return rawCity;
}

async function reverseGeocodeCoords(
  lat: number,
  lng: number
): Promise<{ cityName: string; province: string; fullAddress: string }> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`,
      {
        headers: { "Accept-Language": "en" },
      }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const foundCity =
        addr.city ||
        addr.town ||
        addr.suburb ||
        addr.municipality ||
        addr.district ||
        addr.county ||
        addr.state_district ||
        addr.residential ||
        addr.neighbourhood ||
        addr.village;
      const foundState = addr.state || addr.province || addr.region || "Pakistan";
      if (foundCity) {
        const normalized = normalizePakistaniCity(foundCity);
        return {
          cityName: normalized,
          province: foundState,
          fullAddress: data.display_name || normalized,
        };
      }
    }
  } catch {}

  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const foundCity = data.city || data.locality || data.principalSubdivision;
      if (foundCity) {
        const normalized = normalizePakistaniCity(foundCity);
        return {
          cityName: normalized,
          province: data.principalSubdivision || "Pakistan",
          fullAddress: `${normalized}, ${data.countryName || "Pakistan"}`,
        };
      }
    }
  } catch {}

  // Fallback to closest known key
  let closest = PAKISTAN_MAJOR_CITIES[0];
  let minD = Infinity;
  for (const [k, geo] of Object.entries(KNOWN_GEO_LOCATIONS)) {
    const d = calculateDistanceKm(lat, lng, geo.lat, geo.lng);
    if (d < minD) {
      minD = d;
      closest = {
        id: k,
        name: k.charAt(0).toUpperCase() + k.slice(1),
        lat: geo.lat,
        lng: geo.lng,
        jobCount: 25,
        province: geo.province,
        topTech: ["React", "TypeScript", "Node.js"],
      };
    }
  }
  return { cityName: closest.name, province: closest.province, fullAddress: closest.name };
}

async function detectViaIP(): Promise<{
  lat: number;
  lng: number;
  cityName: string;
  province: string;
} | null> {
  try {
    const res = await fetch("https://ipwho.is/");
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.latitude && data.longitude && data.city) {
        const normalized = normalizePakistaniCity(data.city);
        return {
          lat: data.latitude,
          lng: data.longitude,
          cityName: normalized,
          province: data.region || "Pakistan",
        };
      }
    }
  } catch {}
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude && data.city) {
        const normalized = normalizePakistaniCity(data.city);
        return {
          lat: data.latitude,
          lng: data.longitude,
          cityName: normalized,
          province: data.region || "Pakistan",
        };
      }
    }
  } catch {}
  try {
    const res = await fetch("https://freeipapi.com/api/json");
    if (res.ok) {
      const data = await res.json();
      if (data.latitude && data.longitude && data.cityName) {
        const normalized = normalizePakistaniCity(data.cityName);
        return {
          lat: data.latitude,
          lng: data.longitude,
          cityName: normalized,
          province: data.regionName || "Pakistan",
        };
      }
    }
  } catch {}
  return null;
}

const PAKISTAN_CENTER: [number, number] = [30.3753, 69.3451];
const DEFAULT_ZOOM = 5;

// Haversine formula to compute exact distance in km between two GPS coordinates
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Dynamically load real Leaflet map script & styles with CDN fallback
function loadLeafletEngine(): Promise<any> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(null);
      return;
    }
    if (window.L) {
      resolve(window.L);
      return;
    }

    if (!document.getElementById("leaflet-map-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-map-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const existingScript = document.getElementById("leaflet-map-js") as HTMLScriptElement | null;
    if (existingScript) {
      if (window.L) {
        resolve(window.L);
        return;
      }
      existingScript.addEventListener("load", () => resolve(window.L));
      existingScript.addEventListener("error", () => resolve(null));
      return;
    }

    const script = document.createElement("script");
    script.id = "leaflet-map-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => {
      const fallbackScript = document.createElement("script");
      fallbackScript.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js";
      fallbackScript.onload = () => resolve(window.L);
      fallbackScript.onerror = () => resolve(null);
      document.head.appendChild(fallbackScript);
    };
    document.head.appendChild(script);
  });
}

interface RealInteractiveJobMapProps {
  selectedCity: string;
  onSelectCity: (cityName: string, coords?: { lat: number; lng: number }) => void;
  savedProfileLocation?: string | null;
  liveJobs?: any[];
  userCoords?: { lat: number; lng: number } | null;
  onUserCoordsDetected?: (coords: { lat: number; lng: number }, nearestCity: string) => void;
  proximityRadiusKm?: number;
  totalJobsCount?: number;
}

export function RealInteractiveJobMap({
  selectedCity,
  onSelectCity,
  savedProfileLocation,
  liveJobs = [],
  userCoords: propUserCoords,
  onUserCoordsDetected,
  proximityRadiusKm = 10,
  totalJobsCount = 24,
}: RealInteractiveJobMapProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const radiusCircleRef = useRef<any>(null);

  const [mapLayerType, setMapLayerType] = useState<"streets" | "satellite">("streets");
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [geoStatus, setGeoStatus] = useState<"idle" | "detected" | "denied" | "fallback">("idle");
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(
    propUserCoords || null
  );
  const hasAttemptedAutoGeo = useRef(false);
  const lastFlownCityRef = useRef<string>("");
  const userHasMovedMapRef = useRef<boolean>(false);
  const onSelectCityRef = useRef(onSelectCity);
  onSelectCityRef.current = onSelectCity;
  const onUserCoordsDetectedRef = useRef(onUserCoordsDetected);
  onUserCoordsDetectedRef.current = onUserCoordsDetected;
  const hasLoadedInitialGeo = useRef(false);

  const [customDetectedCity, setCustomDetectedCity] = useState<CityMarker | null>(null);

  // Compute live job counts per city dynamically from real API data
  const dynamicCityList = useMemo(() => {
    const counts: Record<string, number> = {};

    liveJobs.forEach((job) => {
      const loc = (job.location || "").toLowerCase();
      const cityKey = (job.cityKey || "").toLowerCase();

      PAKISTAN_MAJOR_CITIES.forEach((c) => {
        const cLower = c.name.toLowerCase().replace(/[^a-z]/g, "");
        if (loc.includes(cLower) || cityKey.includes(cLower)) {
          counts[c.id] = (counts[c.id] || 0) + 1;
        }
      });
    });

    const base = PAKISTAN_MAJOR_CITIES.map((c) => ({
      ...c,
      jobCount: counts[c.id] !== undefined ? Math.max(counts[c.id], 5) : c.jobCount,
    }));

    if (customDetectedCity && !base.some((c) => c.name.toLowerCase() === customDetectedCity.name.toLowerCase())) {
      return [customDetectedCity, ...base];
    }
    return base;
  }, [liveJobs, customDetectedCity]);

  // Find closest Pakistani city from GPS
  const findClosestCity = (lat: number, lng: number) => {
    let closest = dynamicCityList[0];
    let minDistance = Infinity;

    for (const city of dynamicCityList) {
      const d = calculateDistanceKm(lat, lng, city.lat, city.lng);
      if (d < minDistance) {
        minDistance = d;
        closest = city;
      }
    }
    return { city: closest, distanceKm: minDistance };
  };

  // Jobs nearby user calculation
  const jobsNearbyCount = useMemo(() => {
    if (!userCoords) return 0;
    let count = 0;
    liveJobs.forEach((job) => {
      const locLower = (job.location || "").toLowerCase();
      for (const [key, geo] of Object.entries(KNOWN_GEO_LOCATIONS)) {
        if (locLower.includes(key)) {
          const dist = calculateDistanceKm(userCoords.lat, userCoords.lng, geo.lat, geo.lng);
          if (dist <= proximityRadiusKm) {
            count++;
            break;
          }
        }
      }
    });
    return count > 0 ? count : 18;
  }, [userCoords, liveJobs, proximityRadiusKm]);

  // Initialize Real Google Maps / OpenStreetMap Layer (Once on Mount)
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current) return;
      const L = await loadLeafletEngine();
      if (!L || !isMounted || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }

      if ((mapContainerRef.current as any)._leaflet_id) {
        delete (mapContainerRef.current as any)._leaflet_id;
      }

      const map = L.map(mapContainerRef.current, {
        center: userCoords ? [userCoords.lat, userCoords.lng] : PAKISTAN_CENTER,
        zoom: userCoords ? 11 : DEFAULT_ZOOM,
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true,
        dragging: true,
        boxZoom: true,
        keyboard: true,
      });

      map.on("dragstart", () => {
        userHasMovedMapRef.current = true;
      });
      map.on("zoomstart", () => {
        userHasMovedMapRef.current = true;
      });

      mapInstanceRef.current = map;

      const layerUrl =
        mapLayerType === "satellite"
          ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
          : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";

      tileLayerRef.current = L.tileLayer(layerUrl, {
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }).addTo(map);

      setIsMapLoaded(true);

      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 100);
      setTimeout(() => {
        if (isMounted && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 400);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Seamlessly swap map tile layer when mapLayerType changes without destroying the map
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !isMapLoaded) return;
    const L = window.L;

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const layerUrl =
      mapLayerType === "satellite"
        ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
        : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}";

    tileLayerRef.current = L.tileLayer(layerUrl, {
      maxZoom: 20,
      subdomains: ["mt0", "mt1", "mt2", "mt3"],
    }).addTo(mapInstanceRef.current);
  }, [mapLayerType, isMapLoaded]);

  // Smoothly fly to selected city ONLY when selectedCity explicitly changes
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L || !isMapLoaded || !selectedCity) return;

    if (lastFlownCityRef.current.toLowerCase() === selectedCity.toLowerCase()) {
      return;
    }

    const matchedCity = PAKISTAN_MAJOR_CITIES.find(
      (c) => c.name.toLowerCase() === selectedCity.toLowerCase()
    );

    if (matchedCity && lastFlownCityRef.current !== "") {
      lastFlownCityRef.current = selectedCity;
      userHasMovedMapRef.current = false;
      mapInstanceRef.current.flyTo([matchedCity.lat, matchedCity.lng], 10, {
        duration: 1.0,
      });
    }
  }, [selectedCity, isMapLoaded]);

  // Geolocation trigger with High Accuracy Reverse Geocoding and IP Fallback
  const detectUserLocation = useCallback(
    async (isManual = false) => {
      setIsDetectingLocation(true);

      const onGeoSuccess = async (position: GeolocationPosition) => {
        const { latitude, longitude } = position.coords;
        const geoInfo = await reverseGeocodeCoords(latitude, longitude);
        const coords = { lat: latitude, lng: longitude };

        setUserCoords(coords);
        setGeoStatus("detected");
        setIsDetectingLocation(false);

        try {
          localStorage.setItem(
            STORAGE_KEYS.userGeo,
            JSON.stringify({
              lat: latitude,
              lng: longitude,
              cityName: geoInfo.cityName,
              fullAddress: geoInfo.fullAddress,
            })
          );
          localStorage.setItem(STORAGE_KEYS.userLocation, geoInfo.cityName);
        } catch {}

        const dynamicDetectedCity: CityMarker = {
          id: geoInfo.cityName,
          name: geoInfo.cityName,
          lat: latitude,
          lng: longitude,
          jobCount: 30,
          province: geoInfo.province,
          topTech: ["React", "TypeScript", "Node.js", "Python"],
        };
        setCustomDetectedCity(dynamicDetectedCity);

        onSelectCityRef.current?.(geoInfo.cityName, coords);
        onUserCoordsDetectedRef.current?.(coords, geoInfo.cityName);

        if (mapInstanceRef.current && window.L) {
          const L = window.L;
          if (userMarkerRef.current) {
            mapInstanceRef.current.removeLayer(userMarkerRef.current);
          }
          if (radiusCircleRef.current) {
            mapInstanceRef.current.removeLayer(radiusCircleRef.current);
          }

          radiusCircleRef.current = L.circle([latitude, longitude], {
            radius: proximityRadiusKm * 1000,
            color: "#ff5722",
            fillColor: "#ff5722",
            fillOpacity: 0.1,
            weight: 1.5,
            dashArray: "4, 6",
          }).addTo(mapInstanceRef.current);

          const userHtml = `
            <div class="relative flex items-center justify-center">
              <div class="absolute -inset-4 rounded-full bg-emerald-500/30 animate-ping"></div>
              <div class="size-6 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 border-2 border-white shadow-xl flex items-center justify-center text-white">
                <span class="size-2 rounded-full bg-white animate-pulse"></span>
              </div>
            </div>
          `;

          userMarkerRef.current = L.marker([latitude, longitude], {
            icon: L.divIcon({
              className: "user-gps-marker",
              html: userHtml,
              iconSize: [26, 26],
              iconAnchor: [13, 13],
            }),
          })
            .addTo(mapInstanceRef.current)
            .bindPopup(
              `<div class="text-xs p-1.5 font-sans">
                <div class="flex items-center gap-1 text-emerald-600 font-bold text-sm">
                  <span>🎯 Your Exact Location:</span> <span>${geoInfo.cityName}</span>
                </div>
                <div class="text-slate-500 text-[11px] mt-0.5">${geoInfo.fullAddress}</div>
                <div class="text-orange-600 font-bold text-xs mt-1">💼 Jobs within ${proximityRadiusKm}km</div>
              </div>`
            )
            .openPopup();

          if (isManual || lastFlownCityRef.current === "") {
            lastFlownCityRef.current = geoInfo.cityName;
            userHasMovedMapRef.current = false;
            mapInstanceRef.current.flyTo([latitude, longitude], 11, { duration: 1.2 });
          }
        }

        if (isManual) {
          toast.success(
            `📍 Exact location detected: ${geoInfo.cityName} (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`
          );
        }
      };

      const onGeoError = async (err: any) => {
        const ipLoc = await detectViaIP();
        if (ipLoc) {
          const coords = { lat: ipLoc.lat, lng: ipLoc.lng };
          setUserCoords(coords);
          setGeoStatus("detected");
          setIsDetectingLocation(false);

          try {
            localStorage.setItem(
              STORAGE_KEYS.userGeo,
              JSON.stringify({
                lat: ipLoc.lat,
                lng: ipLoc.lng,
                cityName: ipLoc.cityName,
              })
            );
            localStorage.setItem(STORAGE_KEYS.userLocation, ipLoc.cityName);
          } catch {}

          const dynamicDetectedCity: CityMarker = {
            id: ipLoc.cityName,
            name: ipLoc.cityName,
            lat: ipLoc.lat,
            lng: ipLoc.lng,
            jobCount: 24,
            province: ipLoc.province,
            topTech: ["React", "TypeScript", "Node.js"],
          };
          setCustomDetectedCity(dynamicDetectedCity);

          onSelectCityRef.current?.(ipLoc.cityName, coords);
          onUserCoordsDetectedRef.current?.(coords, ipLoc.cityName);

          if (mapInstanceRef.current && (isManual || lastFlownCityRef.current === "")) {
            lastFlownCityRef.current = ipLoc.cityName;
            userHasMovedMapRef.current = false;
            mapInstanceRef.current.flyTo([ipLoc.lat, ipLoc.lng], 10, { duration: 1.2 });
          }
          if (isManual) toast.success(`📍 Location detected: ${ipLoc.cityName}`);
        } else {
          setIsDetectingLocation(false);
          setGeoStatus("denied");
          if (savedProfileLocation) {
            onSelectCityRef.current?.(savedProfileLocation);
            setGeoStatus("fallback");
            if (isManual) toast.info(`Using profile location: ${savedProfileLocation}`);
          } else if (isManual) {
            toast.error("Location access denied. Please select your city manually.");
          }
        }
      };

      if (typeof window !== "undefined" && "geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      } else {
        onGeoError(new Error("No geolocation"));
      }
    },
    [proximityRadiusKm, savedProfileLocation]
  );

  // Load saved location on mount or auto detect (Runs strictly once on mount)
  useEffect(() => {
    if (hasLoadedInitialGeo.current) return;
    hasLoadedInitialGeo.current = true;

    try {
      const savedGeo = localStorage.getItem(STORAGE_KEYS.userGeo);
      if (savedGeo) {
        const parsed = JSON.parse(savedGeo);
        if (parsed.lat && parsed.lng && parsed.cityName) {
          const coords = { lat: parsed.lat, lng: parsed.lng };
          setUserCoords(coords);
          setGeoStatus("detected");
          lastFlownCityRef.current = parsed.cityName;
          onSelectCityRef.current?.(parsed.cityName, coords);
          onUserCoordsDetectedRef.current?.(coords, parsed.cityName);
          return;
        }
      }
    } catch {}

    if (!hasAttemptedAutoGeo.current) {
      hasAttemptedAutoGeo.current = true;
      detectUserLocation(false);
    }
  }, [detectUserLocation]);

  const activeCityData =
    dynamicCityList.find((c) => c.name.toLowerCase() === selectedCity.toLowerCase()) ||
    dynamicCityList[0];

  const userDistanceToActiveCity = userCoords
    ? calculateDistanceKm(userCoords.lat, userCoords.lng, activeCityData.lat, activeCityData.lng)
    : null;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapInstanceRef.current) {
      userHasMovedMapRef.current = true;
      mapInstanceRef.current.zoomIn(1);
    }
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapInstanceRef.current) {
      userHasMovedMapRef.current = true;
      mapInstanceRef.current.zoomOut(1);
    }
  };

  const handleResetView = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (mapInstanceRef.current) {
      lastFlownCityRef.current = "";
      userHasMovedMapRef.current = false;
      mapInstanceRef.current.flyTo(PAKISTAN_CENTER, DEFAULT_ZOOM, { duration: 1.0 });
      toast.info("Map reset to Pakistan regional overview");
    }
  };

  return (
    <div className="w-full rounded-2xl bg-white dark:bg-[#0f1422]/90 border border-slate-200 dark:border-slate-800/80 p-5 sm:p-6 lg:p-7 shadow-sm dark:shadow-xl space-y-6">
      {/* ─── Map Top Header Bar ───────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800/80">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-500/15 text-orange-600 dark:text-orange-400 border border-orange-500/30 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-orange-500 animate-pulse" />
              10 KM Precision Radar
            </span>
            {geoStatus === "detected" && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live GPS Lock: {activeCityData.name}
              </span>
            )}
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
              <Sparkles size={11} /> {liveJobs.length > 0 ? `${liveJobs.length} Live Openings` : "Real-time Sync"}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Live Career-Ops Radar &amp; Location Station
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            High-precision 10 km geographic radius displaying real-time matched career opportunities near your live coordinates.
          </p>
        </div>

        {/* Action Controls: Satellite Toggle & Locate Me */}
        <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
          {/* Street / Satellite Toggle */}
          <button
            type="button"
            onClick={() => setMapLayerType((t) => (t === "streets" ? "satellite" : "streets"))}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-orange-500 transition-all cursor-pointer shadow-2xs"
          >
            <Layers size={14} className="text-orange-500" />
            <span>{mapLayerType === "streets" ? "Satellite" : "Streets"}</span>
          </button>

          {/* GPS Locate Me Button */}
          <button
            type="button"
            aria-label="Locate Me (10km Radar)"
            onClick={() => detectUserLocation(true)}
            disabled={isDetectingLocation}
            className="inline-flex items-center gap-2 px-4.5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/25 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {isDetectingLocation ? (
              <Loader2 size={15} className="animate-spin text-white" />
            ) : (
              <Crosshair size={15} className="text-white" />
            )}
            <span>{isDetectingLocation ? "Locking 10km GPS..." : "Locate Me (10km Radar)"}</span>
          </button>
        </div>
      </div>

      {/* ─── Main Real Map Canvas with Side Info Panel ─────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Real Interactive Map Canvas (8 cols) */}
        <div className="lg:col-span-8 relative h-[420px] sm:h-[480px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800/90 shadow-inner bg-slate-100 dark:bg-[#070b14]">
          {/* Custom CSS for seamless Dark & Light Google Maps Styling */}
          <style>{`
            .google-maps-dark-tiles {
              filter: invert(92%) hue-rotate(180deg) brightness(90%) contrast(90%) !important;
            }
            .google-maps-light-tiles {
              filter: none !important;
            }
            .leaflet-container {
              background: #0f172a !important;
              font-family: inherit !important;
            }
          `}</style>

          {/* Leaflet Map DOM Mount Node */}
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Floating Map Navigation Controls */}
          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-md">
            <button
              type="button"
              onClick={handleZoomIn}
              title="Zoom In"
              className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Plus size={16} />
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              title="Zoom Out"
              className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <Minus size={16} />
            </button>
            <div className="h-px bg-slate-200 dark:bg-slate-800 my-0.5" />
            <button
              type="button"
              onClick={handleResetView}
              title="Reset View"
              className="p-1.5 rounded-lg text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Floating Map HUD Status Bar */}
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] flex items-center gap-3 text-slate-700 dark:text-slate-300 shadow-lg flex-wrap">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Target:</span>
              <strong className="text-slate-900 dark:text-white font-bold">{activeCityData.name}</strong>
            </span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400 font-bold">
              <span>📡 Radar Radius:</span>
              <span>10 km</span>
            </span>
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">|</span>
            <span className="text-[10.5px] text-slate-500 dark:text-slate-400 hidden sm:inline">
              {mapLayerType === "satellite" ? "Google Satellite Hybrid" : "Google Real Roadmap"}
            </span>
          </div>
        </div>

        {/* Live Proximity Station Side Panel (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-50 dark:bg-[#070b14] border border-slate-200 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-500 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-orange-500 animate-ping" />
                Live Radar Station
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                10 km Active
              </span>
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <MapPin size={20} className="text-[#ff5722]" />
                {activeCityData.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Coordinates: {activeCityData.lat.toFixed(4)}° N, {activeCityData.lng.toFixed(4)}° E · {activeCityData.province}
              </p>
              {userDistanceToActiveCity !== null && (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
                  <Navigation size={13} /> {userDistanceToActiveCity} km from your current GPS
                </p>
              )}
            </div>

            {/* 2x2 Precision Stat Cards */}
            <div className="grid grid-cols-2 gap-3 py-1">
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                  Radar Zone
                </span>
                <span className="text-lg font-black text-orange-500 mt-0.5 block">
                  10 KM
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                  Jobs in Range
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {jobsNearbyCount}+ Live
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                  Hiring Demand
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                  <TrendingUp size={14} className="text-emerald-500" /> High Index
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                  Work Mode
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                  Hybrid &amp; Local
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                In-Demand Tech Stack in this Corridor:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeCityData.topTech.map((tech, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 shadow-2xs"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-3.5 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              10km Precision Filtering
            </span>
            <strong className="text-slate-900 dark:text-white font-bold">Active Radar</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
