import { describe, it, expect, vi } from "vitest";
import http from "node:http";
import { app } from "./_core/app";
import { createGeminiLiveToken } from "./geminiLiveToken";

describe("GeminiLiveToken Service & Endpoint", () => {
  it("generates a live ephemeral token or provides a clean error if unconfigured", async () => {
    const result = await createGeminiLiveToken();
    expect(result).toBeDefined();
    if (result.ok) {
      expect(result.token).toBeDefined();
      expect(result.token?.startsWith("auth_tokens/")).toBe(true);
      expect(result.wsUrl).toContain("wss://generativelanguage.googleapis.com");
      expect(result.wsUrl).toContain("access_token=");
      expect(result.model).toContain("gemini");
    } else {
      expect(result.error).toBeDefined();
    }
  });

  it("serves /api/gemini-live-token over HTTP", async () => {
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address() as any;
    const port = addr.port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/gemini-live-token`);
      const data: any = await res.json();
      expect(data).toBeDefined();
      expect(typeof data.ok).toBe("boolean");
      if (data.ok) {
        expect(res.status).toBe(200);
        expect(data.wsUrl).toContain("wss://generativelanguage.googleapis.com");
      }
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
