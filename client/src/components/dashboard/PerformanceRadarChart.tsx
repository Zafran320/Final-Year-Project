import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { RadarMetric } from "./types";
import { useTheme } from "@/contexts/ThemeContext";

interface PerformanceRadarChartProps {
  metrics: RadarMetric[];
  animationKey?: number;
  width?: number;
  height?: number;
}

export function PerformanceRadarChart({
  metrics,
  animationKey = 0,
  width = 380,
  height = 340,
}: PerformanceRadarChartProps) {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  // Center & radius
  const cx = width / 2;
  const cy = height / 2;
  const maxRadius = Math.min(cx, cy) - 58;

  // Grid levels (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];
  const numPoints = metrics.length || 7;

  // Calculate polygon points for a given radius multiplier or metric values
  const getCoordinates = (index: number, radius: number) => {
    const angle = (Math.PI * 2 / numPoints) * index - Math.PI / 2; // start from top
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return { x, y, angle };
  };

  // Generate grid polygon paths
  const gridPolygons = useMemo(() => {
    return gridLevels.map((level) => {
      const points = metrics.map((_, i) => {
        const { x, y } = getCoordinates(i, maxRadius * level);
        return `${x},${y}`;
      });
      return points.join(" ");
    });
  }, [metrics, maxRadius, numPoints]);

  // Spokes from center to outer points
  const spokes = useMemo(() => {
    return metrics.map((_, i) => {
      const { x, y } = getCoordinates(i, maxRadius);
      return { x1: cx, y1: cy, x2: x, y2: y };
    });
  }, [metrics, maxRadius, numPoints]);

  // Compute animated metric values
  const dataPoints = metrics.map((m, i) => {
    const r = (m.value / 100) * maxRadius;
    const { x, y } = getCoordinates(i, r);
    return { ...m, x, y, radius: r };
  });

  const polygonPath = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full max-w-[390px] h-auto overflow-visible"
      >
        <defs>
          {/* Radar area glowing gradient */}
          <linearGradient id="radarFillGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff5722" stopOpacity={isDark ? 0.45 : 0.35} />
            <stop offset="50%" stopColor="#e8442e" stopOpacity={isDark ? 0.3 : 0.22} />
            <stop offset="100%" stopColor="#fb923c" stopOpacity={isDark ? 0.15 : 0.1} />
          </linearGradient>

          {/* Glowing filter */}
          <filter id="glowEffect" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Concentric Polygonal Web Grid */}
        {gridPolygons.map((points, idx) => (
          <polygon
            key={`grid-${idx}`}
            points={points}
            fill={
              idx === gridPolygons.length - 1
                ? isDark
                  ? "rgba(15, 23, 42, 0.4)"
                  : "rgba(241, 245, 249, 0.6)"
                : "none"
            }
            stroke={isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(15, 23, 42, 0.1)"}
            strokeWidth="1"
            strokeDasharray={idx < gridPolygons.length - 1 ? "2,2" : undefined}
          />
        ))}

        {/* Radial Spokes */}
        {spokes.map((spoke, idx) => (
          <line
            key={`spoke-${idx}`}
            x1={spoke.x1}
            y1={spoke.y1}
            x2={spoke.x2}
            y2={spoke.y2}
            stroke={isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(15, 23, 42, 0.12)"}
            strokeWidth="1"
          />
        ))}

        {/* Inner percentage markers along vertical axis */}
        {gridLevels.slice(0, 4).map((lvl, idx) => {
          const yPos = cy - maxRadius * lvl;
          return (
            <text
              key={`lvl-${idx}`}
              x={cx + 4}
              y={yPos - 2}
              fill={isDark ? "rgba(148, 163, 184, 0.6)" : "rgba(100, 116, 139, 0.7)"}
              fontSize="9"
              fontFamily="sans-serif"
            >
              {Math.round(lvl * 100)}%
            </text>
          );
        })}

        {/* Animated Filled Radar Polygon Area */}
        <motion.polygon
          key={`radar-polygon-${animationKey}-${theme}`}
          initial={{
            points: metrics.map(() => `${cx},${cy}`).join(" "),
            opacity: 0,
          }}
          animate={{
            points: polygonPath,
            opacity: 1,
          }}
          transition={{
            duration: 1.1,
            ease: [0.16, 1, 0.3, 1],
          }}
          fill="url(#radarFillGradient)"
          stroke="#ff5722"
          strokeWidth="2.5"
          filter="url(#glowEffect)"
        />

        {/* Vertex Anchors & Pulse Dots */}
        {dataPoints.map((point, idx) => {
          const outerCoord = getCoordinates(idx, maxRadius + 18);
          // Determine text anchor based on angle
          let textAnchor: "middle" | "start" | "end" = "middle";
          if (outerCoord.x > cx + 15) textAnchor = "start";
          else if (outerCoord.x < cx - 15) textAnchor = "end";

          return (
            <g key={`vertex-${idx}`}>
              {/* Animated vertex point */}
              <motion.circle
                key={`dot-${idx}-${animationKey}`}
                initial={{ cx, cy, r: 0 }}
                animate={{ cx: point.x, cy: point.y, r: 4.5 }}
                transition={{
                  duration: 1.1,
                  ease: [0.16, 1, 0.3, 1],
                  delay: idx * 0.04,
                }}
                fill="#ffffff"
                stroke="#ff5722"
                strokeWidth="2.5"
                className="cursor-pointer hover:scale-150 transition-transform"
                style={{
                  filter: "drop-shadow(0 0 5px rgba(255, 87, 34, 0.8))",
                }}
              />

              {/* Metric Label & Percentage */}
              <text
                x={outerCoord.x}
                y={outerCoord.y + 3}
                textAnchor={textAnchor}
                fill={isDark ? "#cbd5e1" : "#1e293b"}
                className="font-medium text-[11px] tracking-tight"
              >
                {point.label}
              </text>
              <text
                x={outerCoord.x}
                y={outerCoord.y + 15}
                textAnchor={textAnchor}
                fill={isDark ? "#fb923c" : "#ea580c"}
                className="font-bold text-[10.5px]"
              >
                {point.value}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
