import "dotenv/config";
import { describe, expect, it } from "vitest";

describe("Gemini API configuration", () => {
  it("accepts the configured server-only key for the models endpoint", async () => {
    const apiKey = process.env.GEMINI_API_KEY;
    expect(apiKey, "GEMINI_API_KEY must be configured for this integration test").toBeTruthy();

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models?key=" + encodeURIComponent(apiKey ?? ""));
    expect(response.ok).toBe(true);
  }, 15_000);
});
