import { describe, expect, it } from "vitest";
import { normalizePracticeLocation } from "./practiceNavigation";

describe("normalizePracticeLocation", () => {
  it("removes the retired preview parameter while retaining the requested practice screen", () => {
    expect(normalizePracticeLocation("/", "?screen=consent&preview=1")).toBe("/?screen=consent");
  });

  it("leaves regular public and practice URLs unchanged", () => {
    expect(normalizePracticeLocation("/", "")).toBe("/");
    expect(normalizePracticeLocation("/", "?screen=intake")).toBe("/?screen=intake");
  });
});
