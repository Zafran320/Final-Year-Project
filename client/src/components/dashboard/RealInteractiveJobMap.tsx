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
import { useUserLocation } from "@/lib/userLocation";
import { PAKISTAN_CITIES, distanceKm } from "@shared/pakistanCities";

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

// Derived from the shared city table so client and server agree on city names and coordinates.
export const KNOWN_GEO_LOCATIONS: Record<string, { lat: number; lng: number; province: string }> = Object.fromEntries(
  PAKISTAN_CITIES.map((city) => [city.key, { lat: city.lat, lng: city.lng, province: city.province }])
);

export const PAKISTAN_MAJOR_CITIES: CityMarker[] = [
  {
    id: "Islamabad",
    name: "Islamabad",
    lat: 33.6844,
    lng: 73.0479,
    jobCount: 0,
    province: "Federal Capital",
    topTech: [],
  },
  {
    id: "Rawalpindi",
    name: "Rawalpindi",
    lat: 33.5651,
    lng: 73.0169,
    jobCount: 0,
    province: "Punjab",
    topTech: [],
  },
  {
    id: "Wah Cantt",
    name: "Wah Cantt",
    lat: 33.7715,
    lng: 72.7511,
    jobCount: 0,
    province: "Punjab",
    topTech: [],
  },
  {
    id: "Lahore",
    name: "Lahore",
    lat: 31.5204,
    lng: 74.3587,
    jobCount: 0,
    province: "Punjab",
    topTech: [],
  },
  {
    id: "Karachi",
    name: "Karachi",
    lat: 24.8607,
    lng: 67.0011,
    jobCount: 0,
    province: "Sindh",
    topTech: [],
  },
  {
    id: "Peshawar",
    name: "Peshawar",
    lat: 34.0151,
    lng: 71.5249,
    jobCount: 0,
    province: "KPK",
    topTech: [],
  },
  {
    id: "Faisalabad",
    name: "Faisalabad",
    lat: 31.4504,
    lng: 73.135,
    jobCount: 0,
    province: "Punjab",
    topTech: [],
  },
  {
    id: "Gujranwala",
    name: "Gujranwala",
    lat: 32.1877,
    lng: 74.1945,
    jobCount: 0,
    province: "Punjab",
    topTech: [],
  },
  {
    id: "Sialkot",
    name: "Sialkot",
    lat: 32.4945,
    lng: 74.5229,
    jobCount: 0,
    province: "Punjab",
    topTech: [],
  },
  {
    id: "Abbottabad",
    name: "Abbottabad",
    lat: 34.1688,
    lng: 73.2215,
    jobCount: 0,
    province: "KPK",
    topTech: [],
  },
  {
    id: "Multan",
    name: "Multan",
    lat: 30.1575,
    lng: 71.5249,
    jobCount: 0,
    province: "Punjab",
    topTech: [],
  },
  {
    id: "Quetta",
    name: "Quetta",
    lat: 30.1798,
    lng: 66.975,
    jobCount: 0,
    province: "Balochistan",
    topTech: [],
  },
];

const PAKISTAN_CENTER: [number, number] = [30.3753, 69.3451];
const DEFAULT_ZOOM = 5;

// Kept as a named export for existing callers; the implementation lives in the shared city module.
export const calculateDistanceKm = distanceKm;

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
  const lastFlownCityRef = useRef<string>("");
  const userHasMovedMapRef = useRef<boolean>(false);
  const onSelectCityRef = useRef(onSelectCity);
  onSelectCityRef.current = onSelectCity;
  const onUserCoordsDetectedRef = useRef(onUserCoordsDetected);
  onUserCoordsDetectedRef.current = onUserCoordsDetected;

  const [customDetectedCity, setCustomDetectedCity] = useState<CityMarker | null>(null);

  // Per-city job count, most-requested skills and most common work mode, all from the live jobs.
  const { dynamicCityList, cityWorkMode } = useMemo(() => {
    const counts: Record<string, number> = {};
    const skills: Record<string, Record<string, number>> = {};
    const modes: Record<string, Record<string, number>> = {};

    liveJobs.forEach((job) => {
      const loc = (job.location || "").toLowerCase();
      const cityKey = (job.cityKey || "").toLowerCase();

      PAKISTAN_MAJOR_CITIES.forEach((c) => {
        const cLower = c.name.toLowerCase().replace(/[^a-z]/g, "");
        if (loc.includes(cLower) || cityKey.includes(cLower)) {
          counts[c.id] = (counts[c.id] || 0) + 1;
          (job.coreSkills || []).forEach((skill: string) => {
            skills[c.id] ??= {};
            skills[c.id][skill] = (skills[c.id][skill] || 0) + 1;
          });
          if (job.workMode) {
            modes[c.id] ??= {};
            modes[c.id][job.workMode] = (modes[c.id][job.workMode] || 0) + 1;
          }
        }
      });
    });

    const topEntries = (tally: Record<string, number> | undefined, n: number) =>
      Object.entries(tally ?? {}).sort((a, b) => b[1] - a[1]).slice(0, n).map(([name]) => name);

    const base = PAKISTAN_MAJOR_CITIES.map((c) => ({
      ...c,
      jobCount: counts[c.id] ?? 0,
      topTech: topEntries(skills[c.id], 5),
    }));
    const workModeByCity = Object.fromEntries(PAKISTAN_MAJOR_CITIES.map((c) => [c.id, topEntries(modes[c.id], 1)[0] ?? null]));

    const list =
      customDetectedCity && !base.some((c) => c.name.toLowerCase() === customDetectedCity.name.toLowerCase())
        ? [customDetectedCity, ...base]
        : base;
    return { dynamicCityList: list, cityWorkMode: workModeByCity as Record<string, string | null> };
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

  // Jobs the server ranked as in the user's city or within 50 km of them.
  const jobsNearbyCount = useMemo(
    () => liveJobs.filter((job) => job.proximityTier === "same-city" || job.proximityTier === "nearby").length,
    [liveJobs]
  );

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

  // Location comes from the shared hook (GPS → server geocoder → saved 24 h → profile city).
  const { location: resolvedLocation, status: locationStatus, detect } = useUserLocation(savedProfileLocation);

  useEffect(() => {
    setIsDetectingLocation(locationStatus === "detecting");
    if (locationStatus === "denied" || locationStatus === "error") setGeoStatus(savedProfileLocation ? "fallback" : "denied");
  }, [locationStatus, savedProfileLocation]);

  // Draw the user marker and tell the parent whenever the resolved location changes.
  const lastAppliedLocationRef = useRef<string>("");
  useEffect(() => {
    const { lat, lng, city } = resolvedLocation;
    const signature = `${city}|${lat}|${lng}|${resolvedLocation.source}`;
    if (signature === lastAppliedLocationRef.current) return;

    if (lat === null || lng === null) {
      lastAppliedLocationRef.current = signature;
      onSelectCityRef.current?.(city);
      return;
    }
    // Only treat GPS/manual choices as "the user's position"; a profile/default city is just a starting view.
    const isUserPosition = resolvedLocation.source === "gps" || resolvedLocation.source === "manual";
    const coords = { lat, lng };
    if (isUserPosition) {
      setUserCoords(coords);
      setGeoStatus("detected");
      if (resolvedLocation.cityKey === null) {
        setCustomDetectedCity({ id: city, name: city, lat, lng, jobCount: 0, province: "", topTech: [] });
      }
      onUserCoordsDetectedRef.current?.(coords, city);
    }
    onSelectCityRef.current?.(city, coords);

    if (!mapInstanceRef.current || !window.L || !isMapLoaded) return;
    lastAppliedLocationRef.current = signature;
    const map = mapInstanceRef.current;
    const L = window.L;

    if (isUserPosition) {
      if (userMarkerRef.current) map.removeLayer(userMarkerRef.current);
      if (radiusCircleRef.current) map.removeLayer(radiusCircleRef.current);

      radiusCircleRef.current = L.circle([lat, lng], {
        radius: proximityRadiusKm * 1000,
        color: "#ff5722",
        fillColor: "#ff5722",
        fillOpacity: 0.1,
        weight: 1.5,
        dashArray: "4, 6",
      }).addTo(map);

      const userHtml = `
        <div class="relative flex items-center justify-center">
          <div class="absolute -inset-4 rounded-full bg-emerald-500/30 animate-ping"></div>
          <div class="size-6 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 border-2 border-white shadow-xl flex items-center justify-center text-white">
            <span class="size-2 rounded-full bg-white animate-pulse"></span>
          </div>
        </div>
      `;
      const popup = document.createElement("div");
      popup.className = "text-xs p-1.5 font-sans";
      const title = document.createElement("div");
      title.className = "text-emerald-600 font-bold text-sm";
      title.textContent = `${resolvedLocation.source === "gps" ? "📍 Your location" : "📍 Your chosen city"}: ${city}`;
      popup.appendChild(title);
      if (resolvedLocation.formattedAddress) {
        const address = document.createElement("div");
        address.className = "text-slate-500 text-[11px] mt-0.5";
        address.textContent = resolvedLocation.formattedAddress;
        popup.appendChild(address);
      }

      userMarkerRef.current = L.marker([lat, lng], {
        icon: L.divIcon({ className: "user-gps-marker", html: userHtml, iconSize: [26, 26], iconAnchor: [13, 13] }),
      })
        .addTo(map)
        .bindPopup(popup);
    }

    lastFlownCityRef.current = city;
    userHasMovedMapRef.current = false;
    map.flyTo([lat, lng], isUserPosition ? 11 : 10, { duration: 1.2 });
  }, [resolvedLocation, isMapLoaded, proximityRadiusKm]);

  const detectUserLocation = useCallback(
    async (isManual = false) => {
      const result = await detect();
      if (!isManual) return;
      if (result) {
        toast.success(`📍 Location detected: ${result.label}`);
      } else if (savedProfileLocation) {
        toast.info(`Couldn't access your location. Using your profile city: ${savedProfileLocation}`);
      } else {
        toast.error("Location access denied. Please select your city manually.");
      }
    },
    [detect, savedProfileLocation]
  );

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
                  Jobs Near You (≤ 50 km)
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {jobsNearbyCount} Live
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                  Live Jobs in {activeCityData.name}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1 mt-0.5">
                  <TrendingUp size={14} className="text-emerald-500" /> {activeCityData.jobCount}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 shadow-2xs">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">
                  Most Common Work Mode
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 block">
                  {cityWorkMode[activeCityData.id] ?? "No listings yet"}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
                Skills Most Requested in {activeCityData.name}'s Live Jobs:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {activeCityData.topTech.length === 0 && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">No skill data in the current listings.</span>
                )}
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
