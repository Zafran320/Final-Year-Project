import React from "react";
import { motion } from "framer-motion";
import { MetricProgressBarItem } from "./types";
import { useAnimatedCount } from "./useAnimatedCount";

interface MetricProgressBarsProps {
  metrics: MetricProgressBarItem[];
  animationKey?: number;
}

function MetricProgressBarRow({
  item,
  animationKey = 0,
  index = 0,
}: {
  item: MetricProgressBarItem;
  animationKey?: number;
  index?: number;
}) {
  const animatedValue = useAnimatedCount(item.value, 1200 + index * 100, animationKey);

  return (
    <div className="space-y-1.5 py-1">
      <div className="flex items-center justify-between text-xs font-medium">
        <span className="text-slate-700 dark:text-slate-300 font-semibold">{item.label}</span>
        <span className="text-orange-600 dark:text-orange-400 font-bold tabular-nums">{animatedValue}%</span>
      </div>
      <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-900/80 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800/80">
        <motion.div
          key={`bar-${item.key}-${animationKey}`}
          initial={{ width: 0 }}
          animate={{ width: `${item.value}%` }}
          transition={{
            duration: 1.1 + index * 0.1,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="h-full rounded-full bg-gradient-to-r from-orange-600 via-[#ff5722] to-amber-400 shadow-sm"
          style={{
            boxShadow: "0 0 8px rgba(255, 87, 34, 0.4)",
          }}
        />
      </div>
    </div>
  );
}

export function MetricProgressBars({
  metrics,
  animationKey = 0,
}: MetricProgressBarsProps) {
  return (
    <div className="flex flex-col justify-center space-y-3.5 w-full">
      {metrics.map((item, idx) => (
        <MetricProgressBarRow
          key={item.key}
          item={item}
          animationKey={animationKey}
          index={idx}
        />
      ))}
    </div>
  );
}
