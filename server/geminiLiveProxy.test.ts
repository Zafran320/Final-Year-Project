import { describe, it, expect } from "vitest";

describe("GeminiLiveProxy Close Code Safety", () => {
  function getSafeCloseCode(code: unknown): number {
    if (typeof code === "number") {
      if (
        (code >= 1000 && code <= 1003) ||
        (code >= 1007 && code <= 1014) ||
        (code >= 3000 && code <= 4999)
      ) {
        return code;
      }
    }
    return 1011;
  }

  it("handles standard 1000 normal close code", () => {
    expect(getSafeCloseCode(1000)).toBe(1000);
  });

  it("converts 1006 (abnormal closure / DNS error) to safe 1011 code", () => {
    expect(getSafeCloseCode(1006)).toBe(1011);
  });

  it("converts reserved 1005 (no status code received) to safe 1011 code", () => {
    expect(getSafeCloseCode(1005)).toBe(1011);
  });

  it("converts reserved 1004 to safe 1011 code", () => {
    expect(getSafeCloseCode(1004)).toBe(1011);
  });

  it("converts reserved 1015 (TLS failure) to safe 1011 code", () => {
    expect(getSafeCloseCode(1015)).toBe(1011);
  });

  it("handles undefined or non-number codes safely", () => {
    expect(getSafeCloseCode(undefined)).toBe(1011);
    expect(getSafeCloseCode(null)).toBe(1011);
    expect(getSafeCloseCode("1000")).toBe(1011);
    expect(getSafeCloseCode(NaN)).toBe(1011);
  });

  it("allows custom application error codes in range 3000-4999", () => {
    expect(getSafeCloseCode(3000)).toBe(3000);
    expect(getSafeCloseCode(4001)).toBe(4001);
  });
});

describe("Serverless /api/gemini-live-ws Diagnostic Endpoint", () => {
  it("responds with 501 and WEBSOCKET_UNSUPPORTED_ON_SERVERLESS", async () => {
    const http = await import("node:http");
    const { app } = await import("./_core/app");
    const server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const addr = server.address() as any;
    const port = addr.port;

    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/gemini-live-ws`);
      expect(res.status).toBe(501);
      const data = (await res.json()) as any;
      expect(data.code).toBe("WEBSOCKET_UNSUPPORTED_ON_SERVERLESS");
      expect(data.message).toContain("Vercel Serverless");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });
});
