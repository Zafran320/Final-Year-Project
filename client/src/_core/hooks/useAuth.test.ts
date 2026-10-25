/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import { readRuntimeUserMirror } from "./useAuth";

describe("readRuntimeUserMirror", () => {
  afterEach(() => localStorage.clear());

  it("returns a valid cached user shape for refresh-time UI hydration", () => {
    localStorage.setItem("manus-runtime-user-info", JSON.stringify({ id: 1, name: "Mira Ahmed" }));

    expect(readRuntimeUserMirror<{ id: number; name: string }>()).toEqual({ id: 1, name: "Mira Ahmed" });
  });

  it("rejects missing, malformed, and non-object cache values", () => {
    expect(readRuntimeUserMirror()).toBeNull();
    localStorage.setItem("manus-runtime-user-info", "not-json");
    expect(readRuntimeUserMirror()).toBeNull();
    localStorage.setItem("manus-runtime-user-info", JSON.stringify("not-an-object"));
    expect(readRuntimeUserMirror()).toBeNull();
  });
});
