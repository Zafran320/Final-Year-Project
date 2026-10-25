import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation } from "lucide-react";

export interface PakistanCityMarker {
  id: string;
  name: string;
  label: string;
  x: number; // SVG coordinate
  y: number; // SVG coordinate
  jobCount: number;
}

export const PAKISTAN_CITIES: PakistanCityMarker[] = [
  { id: "Peshawar", name: "Peshawar", label: "Peshawar", x: 260, y: 110, jobCount: 14 },
  { id: "Islamabad", name: "Islamabad", label: "Islamabad", x: 305, y: 140, jobCount: 48 },
  { id: "Rawalpindi", name: "Rawalpindi", label: "Rawalpindi", x: 298, y: 162, jobCount: 32 },
  { id: "Lahore", name: "Lahore", label: "Lahore", x: 345, y: 205, jobCount: 65 },
  { id: "Faisalabad", name: "Faisalabad", label: "Faisalabad", x: 290, y: 228, jobCount: 22 },
  { id: "Karachi", name: "Karachi", label: "Karachi", x: 195, y: 395, jobCount: 78 },
];

interface PakistanInteractiveMapProps {
  selectedCity: string;
  onSelectCity: (cityName: string) => void;
}

export function PakistanInteractiveMap({
  selectedCity,
  onSelectCity,
}: PakistanInteractiveMapProps) {
  return (
    <div className="relative w-full h-[280px] sm:h-[320px] rounded-2xl bg-[#090d16]/95 dark:bg-[#070a12]/95 border border-slate-800/80 overflow-hidden flex items-center justify-center p-2 select-none shadow-inner">
      {/* Background Grid & Radar lines */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "24px 24px",
        }}
      />

      {/* SVG Map of Pakistan with Provinces & Geo Paths */}
      <svg
        viewBox="0 0 450 450"
        className="w-full h-full max-h-[310px] overflow-visible drop-shadow-2xl"
      >
        <defs>
          {/* Map Surface Gradient */}
          <linearGradient id="mapSurfaceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#0f172a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#090d16" stopOpacity="0.95" />
          </linearGradient>

          {/* Glowing Pin Gradient */}
          <radialGradient id="pinGlowGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ff5722" stopOpacity="1" />
            <stop offset="50%" stopColor="#e8442e" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#ff5722" stopOpacity="0" />
          </radialGradient>

          {/* Filter for glowing pins */}
          <filter id="pinGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Stylized Pakistan Landmass Polyline/Paths */}
        <g id="pakistan-landmass">
          {/* Northern Areas & Gilgit Baltistan */}
          <path
            d="M260,60 L310,40 L350,55 L370,85 L350,110 L300,100 L260,60 Z"
            fill="url(#mapSurfaceGradient)"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.2"
            className="transition-colors hover:fill-slate-800/80"
          />

          {/* Khyber Pakhtunkhwa (KPK) */}
          <path
            d="M260,60 L300,100 L280,140 L240,160 L210,130 L220,90 L260,60 Z"
            fill="url(#mapSurfaceGradient)"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.2"
            className="transition-colors hover:fill-slate-800/80"
          />

          {/* Punjab Province */}
          <path
            d="M280,140 L350,110 L370,160 L360,230 L310,270 L260,240 L240,160 Z"
            fill="url(#mapSurfaceGradient)"
            stroke="rgba(255, 255, 255, 0.15)"
            strokeWidth="1.2"
            className="transition-colors hover:fill-slate-800/80"
          />

          {/* Balochistan Province */}
          <path
            d="M210,130 L240,160 L260,240 L230,310 L160,320 L110,270 L120,180 L180,140 Z"
            fill="url(#mapSurfaceGradient)"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.2"
            className="transition-colors hover:fill-slate-800/80"
          />

          {/* Sindh Province */}
          <path
            d="M260,240 L310,270 L280,360 L230,380 L190,410 L160,370 L160,320 L230,310 Z"
            fill="url(#mapSurfaceGradient)"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1.2"
            className="transition-colors hover:fill-slate-800/80"
          />

          {/* Arabian Sea coastline indicator */}
          <path
            d="M130,380 Q170,410 200,415 Q240,390 280,385"
            fill="none"
            stroke="rgba(56, 189, 248, 0.25)"
            strokeWidth="1.5"
            strokeDasharray="4,4"
          />
        </g>
      </svg>

      {/* Map Legend Overlay */}
      <div className="absolute bottom-2.5 left-3 text-[10px] text-slate-400 flex items-center gap-2 bg-slate-950/80 px-2.5 py-1 rounded-lg border border-slate-800/80 backdrop-blur-sm">
        <span className="size-2 rounded-full bg-[#ff5722] animate-pulse" />
        <span>Selected Location: <strong className="text-white">{selectedCity}</strong></span>
      </div>
    </div>
  );
}
