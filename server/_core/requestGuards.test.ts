import http from "node:http";
import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./requestGuards";
import { resolveSessionSecret } from "./env";
import { MAX_TTS_TEXT_LENGTH, validateSpeechRequest } from "../ttsRouter";

describe("createRateLimiter", () => {
  it("allows up to max requests per window, then blocks until the window resets", () => {
    const limiter = createRateLimiter({ windowMs: 1_000, max: 2 });
    expect(limiter.check("user:1", 0).allowed).toBe(true);
    expect(limiter.check("user:1", 10).allowed).toBe(true);
    const blocked = limiter.check("user:1", 20);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
    expect(limiter.check("user:2", 20).allowed).toBe(true);
    expect(limiter.check("user:1", 1_001).allowed).toBe(true);
  });
});

describe("resolveSessionSecret", () => {
  it("returns a sufficiently long configured secret unchanged", () => {
    const secret = "x".repeat(32);
    expect(resolveSessionSecret(secret, true)).toBe(secret);
  });

  it("refuses to run in production without a strong secret", () => {
    expect(() => resolveSessionSecret("", true)).toThrow(/JWT_SECRET/);
    expect(() => resolveSessionSecret("short", true)).toThrow(/JWT_SECRET/);
  });

  it("uses a stable random secret in development instead of a hardcoded one", () => {
    const first = resolveSessionSecret("", false);
    expect(first).toHaveLength(64);
    expect(first).not.toContain("fallback");
    expect(resolveSessionSecret("", false)).toBe(first);
  });
});

describe("validateSpeechRequest", () => {
  it("accepts the values the client sends", () => {
    expect(validateSpeechRequest({ text: "Assalam o Alaikum", rate: "+0%", pitch: "-2Hz" })).toBeNull();
  });

  it("rejects empty, oversized, or malformed input", () => {
    expect(validateSpeechRequest({ text: "   " })).toMatch(/required/);
    expect(validateSpeechRequest({ text: "a".repeat(MAX_TTS_TEXT_LENGTH + 1) })).toMatch(/at most/);
    expect(validateSpeechRequest({ text: "hi", rate: "fast" })).toMatch(/rate/);
    expect(validateSpeechRequest({ text: "hi", pitch: 5 })).toMatch(/pitch/);
  });
});

describe("protected cost endpoints", () => {
  it("reject anonymous requests with 401", async () => {
    const { app } = await import("./app");
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as { port: number };

    try {
      const token = await fetch(`http://127.0.0.1:${port}/api/gemini-live-token`);
      expect(token.status).toBe(401);

      const speech = await fetch(`http://127.0.0.1:${port}/api/generate-speech`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "hello" }),
      });
      expect(speech.status).toBe(401);
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
