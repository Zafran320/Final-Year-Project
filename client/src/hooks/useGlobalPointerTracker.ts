import { useEffect } from "react";

/**
 * Global Pointer Tracker:
 * Dynamically tracks cursor coordinates and sets `--ct-pointer-x`, `--ct-pointer-y`,
 * `--ct-tilt-x`, and `--ct-tilt-y` on `:root` with 120fps requestAnimationFrame throttling.
 * This provides ambient mouse-following glow across all pages and screens.
 */
export function useGlobalPointerTracker() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let rafId: number | null = null;
    let pendingX = 65;
    let pendingY = 42;

    const updateCssProperties = () => {
      const tiltX = ((pendingY - 50) / 50) * -2.2;
      const tiltY = ((pendingX - 50) / 50) * 2.8;

      const root = document.documentElement;
      root.style.setProperty("--ct-pointer-x", `${pendingX.toFixed(2)}%`);
      root.style.setProperty("--ct-pointer-y", `${pendingY.toFixed(2)}%`);
      root.style.setProperty("--ct-tilt-x", `${tiltX.toFixed(2)}deg`);
      root.style.setProperty("--ct-tilt-y", `${tiltY.toFixed(2)}deg`);
      rafId = null;
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;

      const width = window.innerWidth || document.documentElement.clientWidth || 1;
      const height = window.innerHeight || document.documentElement.clientHeight || 1;

      pendingX = Math.max(0, Math.min(100, (event.clientX / width) * 100));
      pendingY = Math.max(0, Math.min(100, (event.clientY / height) * 100));

      if (rafId === null) {
        if (typeof window.requestAnimationFrame === "function") {
          rafId = window.requestAnimationFrame(updateCssProperties);
        } else {
          updateCssProperties();
        }
      }
    };

    const handlePointerLeave = () => {
      pendingX = 65;
      pendingY = 42;
      if (rafId !== null && typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      updateCssProperties();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });

    return () => {
      if (rafId !== null && typeof window.cancelAnimationFrame === "function") {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, []);
}
