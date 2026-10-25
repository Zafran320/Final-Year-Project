import { useEffect, useState } from "react";

export function useAnimatedCount(
  targetValue: number,
  durationMs: number = 1400,
  triggerKey?: any
): number {
  const [currentValue, setCurrentValue] = useState<number>(() => {
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      return targetValue;
    }
    return 0;
  });

  useEffect(() => {
    if (typeof process !== "undefined" && process.env.NODE_ENV === "test") {
      setCurrentValue(targetValue);
      return;
    }

    if (typeof window === "undefined" || !window.requestAnimationFrame) {
      setCurrentValue(targetValue);
      return;
    }

    let startTimestamp: number | null = null;
    const startValue = 0;
    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / durationMs, 1);
      // Ease-out expo / cubic
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const nextVal = Math.round(startValue + (targetValue - startValue) * ease);
      setCurrentValue(nextVal);

      if (progress < 1) {
        animationFrameId = window.requestAnimationFrame(step);
      }
    };

    animationFrameId = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        window.cancelAnimationFrame(animationFrameId);
      }
    };
  }, [targetValue, durationMs, triggerKey]);

  return currentValue;
}
