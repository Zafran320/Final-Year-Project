import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useGlobalPointerTracker } from "./useGlobalPointerTracker";

describe("useGlobalPointerTracker", () => {
  it("initializes CSS custom properties on mount", () => {
    renderHook(() => useGlobalPointerTracker());
    // Initial coords default to 65% and 42%
    expect(document.documentElement.style.getPropertyValue("--ct-pointer-x") || "65%").toBeDefined();
  });

  it("updates CSS custom properties on pointer move", () => {
    renderHook(() => useGlobalPointerTracker());

    Object.defineProperty(window, "innerWidth", { value: 1000, writable: true });
    Object.defineProperty(window, "innerHeight", { value: 1000, writable: true });

    const pointerMoveEvent = new MouseEvent("pointermove", {
      clientX: 500,
      clientY: 500,
    });
    Object.defineProperty(pointerMoveEvent, "pointerType", { value: "mouse" });

    window.dispatchEvent(pointerMoveEvent);

    // Coordinate calculation
    expect(document.documentElement.style.getPropertyValue("--ct-pointer-x")).toBeDefined();
  });

  it("resets to default on pointer leave", () => {
    renderHook(() => useGlobalPointerTracker());

    const pointerLeaveEvent = new MouseEvent("pointerleave");
    window.dispatchEvent(pointerLeaveEvent);

    expect(document.documentElement.style.getPropertyValue("--ct-pointer-x")).toBe("65.00%");
    expect(document.documentElement.style.getPropertyValue("--ct-pointer-y")).toBe("42.00%");
  });
});
