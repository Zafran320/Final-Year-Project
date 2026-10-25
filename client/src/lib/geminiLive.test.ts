import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getGeminiLiveWsUrl,
  setCustomGeminiLiveWsUrl,
  CUSTOM_WS_URL_STORAGE_KEY,
  getBargeInThreshold,
} from "./geminiLive";

describe("GeminiLive WebSocket Endpoint Resolution", () => {
  beforeEach(() => {
    localStorage.clear();
    delete (window as any).__GEMINI_LIVE_WS_URL__;
  });

  afterEach(() => {
    localStorage.clear();
    delete (window as any).__GEMINI_LIVE_WS_URL__;
  });

  it("defaults to same-origin /api/gemini-live-ws on localhost (preserves local behavior)", () => {
    const url = getGeminiLiveWsUrl();
    expect(url).toContain("/api/gemini-live-ws");
    expect(url.startsWith("ws://") || url.startsWith("wss://")).toBe(true);
  });

  it("prioritizes custom WebSocket URL from localStorage if set by user", () => {
    setCustomGeminiLiveWsUrl("wss://custom-node.onrender.com/api/gemini-live-ws");
    expect(getGeminiLiveWsUrl()).toBe("wss://custom-node.onrender.com/api/gemini-live-ws");
  });

  it("auto-prepends wss:// protocol if user inputs domain without protocol", () => {
    setCustomGeminiLiveWsUrl("render-backend.com/api/gemini-live-ws");
    const resolved = getGeminiLiveWsUrl();
    expect(resolved).toMatch(/^wss?:\/\/render-backend\.com\/api\/gemini-live-ws$/);
  });

  it("allows clearing custom WebSocket URL to restore default same-origin behavior", () => {
    setCustomGeminiLiveWsUrl("wss://temporary-host.com/api/gemini-live-ws");
    expect(getGeminiLiveWsUrl()).toBe("wss://temporary-host.com/api/gemini-live-ws");

    setCustomGeminiLiveWsUrl(null);
    expect(getGeminiLiveWsUrl()).toContain("/api/gemini-live-ws");
  });

  it("prioritizes window.__GEMINI_LIVE_WS_URL__ if injected at runtime", () => {
    (window as any).__GEMINI_LIVE_WS_URL__ = "wss://injected-runtime.fly.dev/api/gemini-live-ws";
    expect(getGeminiLiveWsUrl()).toBe("wss://injected-runtime.fly.dev/api/gemini-live-ws");
  });
});

describe("GeminiLive Endpoint Resolution Strategy (Localhost vs Vercel Serverless)", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    localStorage.clear();
    delete (window as any).__GEMINI_LIVE_WS_URL__;
  });

  afterEach(() => {
    localStorage.clear();
    delete (window as any).__GEMINI_LIVE_WS_URL__;
    (window as any).location = originalLocation;
  });

  it("identifies localhost environment accurately and selects local proxy", async () => {
    const { resolveGeminiLiveEndpoint, isLocalhostEnvironment } = await import("./geminiLive");
    expect(isLocalhostEnvironment()).toBe(true);

    const resolved = await resolveGeminiLiveEndpoint();
    expect(resolved.isDirectGoogle).toBe(false);
    expect(resolved.source).toBe("localhost_proxy");
    expect(resolved.url).toContain("/api/gemini-live-ws");
  });

  it("fetches ephemeral token and connects directly to Google on Vercel deployment", async () => {
    const { resolveGeminiLiveEndpoint } = await import("./geminiLive");

    // Mock window.location for Vercel
    delete (window as any).location;
    (window as any).location = {
      hostname: "careertwin-ai-main.vercel.app",
      protocol: "https:",
      host: "careertwin-ai-main.vercel.app",
    };

    // Mock global fetch for /api/gemini-live-token
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === "/api/gemini-live-token") {
        return {
          ok: true,
          json: async () => ({
            ok: true,
            token: "auth_tokens/mocked-test-token-123",
            wsUrl:
              "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=mocked-test-token-123",
          }),
        };
      }
      return { ok: false };
    });
    vi.stubGlobal("fetch", mockFetch);

    try {
      const resolved = await resolveGeminiLiveEndpoint();
      expect(resolved.isDirectGoogle).toBe(true);
      expect(resolved.source).toBe("serverless_ephemeral_token");
      expect(resolved.token).toBe("auth_tokens/mocked-test-token-123");
      expect(resolved.url).toContain("generativelanguage.googleapis.com");
      expect(resolved.url).toContain("access_token=mocked-test-token-123");
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("respects custom WebSocket URL even when on Vercel", async () => {
    const { resolveGeminiLiveEndpoint, setCustomGeminiLiveWsUrl } = await import("./geminiLive");

    delete (window as any).location;
    (window as any).location = {
      hostname: "careertwin-ai-main.vercel.app",
      protocol: "https:",
      host: "careertwin-ai-main.vercel.app",
    };

    setCustomGeminiLiveWsUrl("wss://custom-relay.railway.app/api/gemini-live-ws");
    const resolved = await resolveGeminiLiveEndpoint();

    expect(resolved.url).toBe("wss://custom-relay.railway.app/api/gemini-live-ws");
    expect(resolved.isDirectGoogle).toBe(false);
    expect(resolved.source).toBe("custom");
  });
});

describe("GeminiLive AudioContext Unlocking and Ready Chime", () => {
  it("plays ready chime safely without throwing and triggers audio context unlock", async () => {
    const { GeminiLiveSession } = await import("./geminiLive");
    const session = new GeminiLiveSession();

    // Verify playReadyChime exists and does not crash when called before start or after
    expect(typeof session.playReadyChime).toBe("function");
    expect(() => session.playReadyChime()).not.toThrow();

    // Verify unlockAudio does not throw
    expect(typeof session.unlockAudio).toBe("function");
    expect(() => session.unlockAudio()).not.toThrow();

    // Verify isAudioRunning returns boolean
    expect(typeof session.isAudioRunning()).toBe("boolean");
    expect(session.isAudioRunning()).toBe(false);
  });
});

describe("AdaptiveNoiseFloorTracker (Dynamic Ambient Noise Auto-Adjustment)", () => {
  it("sets an adaptive barge-in threshold that accepts normal speech without overreacting to room noise", () => {
    expect(getBargeInThreshold(0.015)).toBeCloseTo(0.024);
    expect(getBargeInThreshold(0.04)).toBeCloseTo(0.054);
    expect(getBargeInThreshold(0.2)).toBe(0.055);
    expect(getBargeInThreshold(Number.NaN)).toBeCloseTo(0.024);
  });

  it("auto-calibrates thresholds in real time to adapt to ambient noise floor", async () => {
    const { AdaptiveNoiseFloorTracker } = await import("./geminiLive");
    const tracker = new AdaptiveNoiseFloorTracker(0.015);

    // Initial quiet baseline
    const initialStats = tracker.processLevel(0.012);
    expect(initialStats.isSpeech).toBe(false);
    expect(initialStats.noiseFloor).toBeLessThanOrEqual(0.015);

    // If room has persistent fan or AC noise (~0.040), noise floor tracks upward gradually
    for (let i = 0; i < 50; i++) {
      tracker.processLevel(0.040);
    }
    const elevatedStats = tracker.processLevel(0.040);
    // Speech threshold automatically scales up so 0.040 is NOT treated as speech
    expect(elevatedStats.speechStartThreshold).toBeGreaterThan(0.040);
    expect(elevatedStats.isSpeech).toBe(false);

    // Real human speech clearly exceeds the adaptive threshold
    const loudSpeechLevel = 0.15;
    tracker.processLevel(loudSpeechLevel);
    const speechStats = tracker.processLevel(loudSpeechLevel); // 2nd frame debouncing
    expect(speechStats.isSpeech).toBe(true);
    expect(tracker.isSpeech()).toBe(true);

    // Downward adaptation when room returns to quiet
    for (let i = 0; i < 20; i++) {
      tracker.processLevel(0.008);
    }
    const quietStats = tracker.processLevel(0.008);
    expect(quietStats.noiseFloor).toBeLessThan(0.03);
    expect(quietStats.isSpeech).toBe(false);
  });
});

