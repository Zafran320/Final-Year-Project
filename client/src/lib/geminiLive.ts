/**
 * FutureMaker AI — Gemini Live real-time speech-to-speech client.
 *
 * Streams raw 16kHz PCM mic audio to the same-origin WebSocket proxy
 * (/api/gemini-live-ws) which bridges the Gemini Live API. The model speaks
 * natively (audio-in → audio-out): no text generation + TTS round trip,
 * giving ultra-low latency, human-like interruptions (barge-in) and native
 * accents for Roman Urdu / Hindi / English.
 */

const LIVE_WS_PATH = "/api/gemini-live-ws";
const CAPTURE_SAMPLE_RATE = 16000;
const PLAYBACK_SAMPLE_RATE = 24000;
// Emit at least 100ms of audio per chunk to keep message rate reasonable
const MIN_OUT_SAMPLES = CAPTURE_SAMPLE_RATE / 10;

export function getBargeInThreshold(noiseFloor: number): number {
  const safeNoiseFloor = Number.isFinite(noiseFloor) ? noiseFloor : 0.015;
  return Math.max(0.018, Math.min(0.055, safeNoiseFloor * 1.2 + 0.006));
}

export const CUSTOM_WS_URL_STORAGE_KEY = "ct_custom_gemini_live_ws_url";

/**
 * Resolves the Gemini Live WebSocket endpoint URL.
 * Priority:
 * 1. User manual override stored in localStorage (ct_custom_gemini_live_ws_url)
 * 2. Window global override (window.__GEMINI_LIVE_WS_URL__)
 * 3. Environment variable (VITE_GEMINI_LIVE_WS_URL)
 * 4. Default: Same-origin ws(s)://<host>/api/gemini-live-ws (Standard local development behavior)
 */
export function getGeminiLiveWsUrl(): string {
  if (typeof window !== "undefined") {
    // 1. Manual user override stored in localStorage
    try {
      const stored = localStorage.getItem(CUSTOM_WS_URL_STORAGE_KEY);
      if (stored && stored.trim()) {
        let url = stored.trim();
        if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
          const isHttps = window.location.protocol === "https:";
          url = (isHttps ? "wss://" : "ws://") + url;
        }
        return url;
      }
    } catch {}

    // 2. Global runtime override
    const globalOverride = (window as any).__GEMINI_LIVE_WS_URL__;
    if (globalOverride && typeof globalOverride === "string" && globalOverride.trim()) {
      return globalOverride.trim();
    }
  }

  // 3. Vite environment variable (VITE_GEMINI_LIVE_WS_URL)
  const envUrl = typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_LIVE_WS_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    let url = envUrl.trim();
    if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
      const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
      url = (isHttps ? "wss://" : "ws://") + url;
    }
    return url;
  }

  // 4. Default: same-origin /api/gemini-live-ws (Works 100% natively on localhost and unified Node servers)
  if (typeof window !== "undefined" && window.location) {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${protocol}//${window.location.host}${LIVE_WS_PATH}`;
  }

  return `ws://localhost:3000${LIVE_WS_PATH}`;
}

export function setCustomGeminiLiveWsUrl(url: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (!url || !url.trim()) {
      localStorage.removeItem(CUSTOM_WS_URL_STORAGE_KEY);
    } else {
      localStorage.setItem(CUSTOM_WS_URL_STORAGE_KEY, url.trim());
    }
  } catch {}
}

export function isLocalhostEnvironment(): boolean {
  if (typeof window === "undefined" || !window.location) return true;
  const h = window.location.hostname;
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".local");
}

export interface LiveEndpointResolution {
  url: string;
  isDirectGoogle: boolean;
  token?: string;
  source: "custom" | "localhost_proxy" | "serverless_ephemeral_token" | "fallback_proxy";
}

/**
 * Resolves the active connection target for Gemini Live.
 * - On Localhost: Connects directly to local Node WebSocket proxy (/api/gemini-live-ws).
 * - On Serverless/Vercel: Fetches ephemeral auth token from /api/gemini-live-token and
 *   connects directly to Google's Bidi WebSocket (bypassing Vercel WS limits).
 * - User/Env overrides take top priority if explicitly specified.
 */
export async function resolveGeminiLiveEndpoint(): Promise<LiveEndpointResolution> {
  // 1. Manual user override stored in localStorage
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem(CUSTOM_WS_URL_STORAGE_KEY);
      if (stored && stored.trim()) {
        let url = stored.trim();
        if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
          const isHttps = window.location.protocol === "https:";
          url = (isHttps ? "wss://" : "ws://") + url;
        }
        return {
          url,
          isDirectGoogle: url.includes("generativelanguage.googleapis.com"),
          source: "custom",
        };
      }
    } catch {}

    // 2. Global runtime override
    const globalOverride = (window as any).__GEMINI_LIVE_WS_URL__;
    if (globalOverride && typeof globalOverride === "string" && globalOverride.trim()) {
      const url = globalOverride.trim();
      return {
        url,
        isDirectGoogle: url.includes("generativelanguage.googleapis.com"),
        source: "custom",
      };
    }
  }

  // 3. Vite environment variable (VITE_GEMINI_LIVE_WS_URL)
  const envUrl = typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GEMINI_LIVE_WS_URL;
  if (envUrl && typeof envUrl === "string" && envUrl.trim()) {
    let url = envUrl.trim();
    if (!url.startsWith("ws://") && !url.startsWith("wss://")) {
      const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
      url = (isHttps ? "wss://" : "ws://") + url;
    }
    return {
      url,
      isDirectGoogle: url.includes("generativelanguage.googleapis.com"),
      source: "custom",
    };
  }

  // 4. Localhost: Preserve local Express WebSocket proxy behavior completely
  if (isLocalhostEnvironment()) {
    return {
      url: getGeminiLiveWsUrl(),
      isDirectGoogle: false,
      source: "localhost_proxy",
    };
  }

  // 5. Remote / Cloud / Vercel: Fetch ephemeral auth token for direct Google Live connection
  try {
    const res = await fetch("/api/gemini-live-token");
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.wsUrl) {
        return {
          url: data.wsUrl,
          isDirectGoogle: true,
          token: data.token,
          source: "serverless_ephemeral_token",
        };
      }
    }
  } catch (err) {
    console.warn("[GeminiLive] Ephemeral token fetch error:", err);
  }

  // 6. Fallback to same-origin proxy
  return {
    url: getGeminiLiveWsUrl(),
    isDirectGoogle: false,
    source: "fallback_proxy",
  };
}


export type LiveStatus = "idle" | "connecting" | "live" | "error" | "closed";

export interface GeminiLiveStartConfig {
  role: string;
  company: string;
  language: string;
  voice?: string;
  systemInstruction?: string;
}

/**
 * AudioWorklet source: captures mic audio, computes an RMS level for VAD and
 * resamples to 16kHz PCM16 chunks posted back to the main thread.
 */
const MIC_WORKLET_SOURCE = `
class FutureMakerMicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.enabled = true;
    this.buffer = new Float32Array(16384);
    this.bufferLen = 0;
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === "set-enabled") {
        this.enabled = !!e.data.enabled;
        if (!this.enabled) { this.bufferLen = 0; }
      }
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    const ch = input[0];

    // RMS level for VAD / UI meter — throttled to ~40fps for high responsiveness without main thread IPC spam
    this._levelTicks = (this._levelTicks || 0) + 1;
    if (this._levelTicks >= 8) {
      this._levelTicks = 0;
      let sum = 0;
      for (let i = 0; i < ch.length; i++) sum += ch[i] * ch[i];
      const level = Math.sqrt(sum / ch.length);
      this.port.postMessage({ type: "level", level });
    }

    if (!this.enabled) return true;

    // Zero-GC circular/sliding buffer accumulation
    if (this.bufferLen + ch.length > this.buffer.length) {
      this.buffer.copyWithin(0, this.bufferLen - 4096, this.bufferLen);
      this.bufferLen = 4096;
    }
    this.buffer.set(ch, this.bufferLen);
    this.bufferLen += ch.length;

    const ratio = sampleRate / ${CAPTURE_SAMPLE_RATE};
    const outLen = Math.floor(this.bufferLen / ratio);
    if (outLen < ${MIN_OUT_SAMPLES}) return true;

    const pcm16 = new Int16Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const pos = i * ratio;
      const lo = Math.floor(pos);
      const hi = Math.min(lo + 1, this.bufferLen - 1);
      const frac = pos - lo;
      const sample = this.buffer[lo] * (1 - frac) + this.buffer[hi] * frac;
      const clamped = Math.max(-1, Math.min(1, sample));
      pcm16[i] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;
    }

    const consumed = Math.floor(outLen * ratio);
    this.buffer.copyWithin(0, consumed, this.bufferLen);
    this.bufferLen -= consumed;

    this.port.postMessage({ type: "audio", pcm16: pcm16.buffer }, [pcm16.buffer]);
    return true;
  }
}
registerProcessor("futuremaker-mic-processor", FutureMakerMicProcessor);
`;

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

function base64ToInt16(base64: string): Int16Array {
  const binary = atob(base64);
  const len = binary.length - (binary.length % 2);
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer, 0, len / 2);
}

export interface NoiseTrackerStats {
  noiseFloor: number;
  speechStartThreshold: number;
  speechEndThreshold: number;
  currentLevel: number;
  snr: number;
  isSpeech: boolean;
}

/**
 * Intelligent Adaptive Noise Floor Tracker:
 * Continuously tracks the ambient background noise floor in real-time.
 * Automatically adapts speech start/end thresholds so background fan noise,
 * AC humming, street traffic, or room static are NEVER treated as speech.
 */
export class AdaptiveNoiseFloorTracker {
  private noiseFloor = 0.015;
  private minNoiseFloor = 0.005;
  private maxNoiseFloor = 0.085;
  private speechStartMargin = 0.015;
  private speechEndMargin = 0.006;
  private speechStartMultiplier = 2.0;
  private speechEndMultiplier = 1.35;
  private isSpeechActive = false;
  private speechStartTimestamp = 0;
  private consecutiveSpeechFrames = 0;
  private consecutiveSilenceFrames = 0;

  constructor(initialFloor = 0.015) {
    this.noiseFloor = initialFloor;
  }

  processLevel(level: number): NoiseTrackerStats {
    const isBelowCurrentFloor = level < this.noiseFloor;

    if (isBelowCurrentFloor) {
      // Rapid downward tracking when room is quieter than expected
      this.noiseFloor = this.noiseFloor * 0.90 + level * 0.10;
    } else if (!this.isSpeechActive) {
      // Slow upward tracking only during silence (absorbs fans/AC without absorbing human speech)
      this.noiseFloor = this.noiseFloor * 0.995 + level * 0.005;
    }

    this.noiseFloor = Math.max(this.minNoiseFloor, Math.min(this.maxNoiseFloor, this.noiseFloor));

    // Dynamic SNR-derived thresholds
    const speechStartThreshold = Math.max(
      0.024,
      Math.min(0.12, this.noiseFloor * this.speechStartMultiplier + this.speechStartMargin)
    );
    const speechEndThreshold = Math.max(
      0.012,
      Math.min(0.08, this.noiseFloor * this.speechEndMultiplier + this.speechEndMargin)
    );

    // Frame debouncing to eliminate single-frame acoustic clicks / taps
    if (!this.isSpeechActive) {
      if (level > speechStartThreshold) {
        this.consecutiveSpeechFrames++;
        if (this.consecutiveSpeechFrames >= 2) {
          this.isSpeechActive = true;
          this.speechStartTimestamp = Date.now();
          this.consecutiveSilenceFrames = 0;
        }
      } else {
        this.consecutiveSpeechFrames = 0;
      }
    } else {
      if (level < speechEndThreshold) {
        this.consecutiveSilenceFrames++;
        if (this.consecutiveSilenceFrames >= 4) {
          this.isSpeechActive = false;
          this.consecutiveSpeechFrames = 0;
        }
      } else {
        this.consecutiveSilenceFrames = 0;
      }
    }

    const snr = this.noiseFloor > 0 ? level / this.noiseFloor : 1;

    return {
      noiseFloor: this.noiseFloor,
      speechStartThreshold,
      speechEndThreshold,
      currentLevel: level,
      snr,
      isSpeech: this.isSpeechActive,
    };
  }

  getNoiseFloor(): number {
    return this.noiseFloor;
  }

  isSpeech(): boolean {
    return this.isSpeechActive;
  }

  reset() {
    this.noiseFloor = 0.015;
    this.isSpeechActive = false;
    this.consecutiveSpeechFrames = 0;
    this.consecutiveSilenceFrames = 0;
    this.speechStartTimestamp = 0;
  }
}

export class GeminiLiveSession {
  // ── Public callbacks ──────────────────────────────────────────────────────
  onStatus: (status: LiveStatus) => void = () => {};
  onAiSpeaking: (speaking: boolean) => void = () => {};
  onUserSpeaking: (speaking: boolean) => void = () => {};
  onUserLevel: (level: number) => void = () => {};
  onNoiseStats: (stats: NoiseTrackerStats) => void = () => {};
  onUserTranscript: (cumulative: string, isFinal: boolean) => void = () => {};
  onAiTranscript: (cumulative: string, isFinal: boolean) => void = () => {};
  onTurnComplete: () => void = () => {};
  onReady: () => void = () => {};
  onError: (message: string) => void = () => {};

  // ── Private state ─────────────────────────────────────────────────────────
  private ws: WebSocket | null = null;
  private audioCtx: AudioContext | null = null;
  private playbackGain: GainNode | null = null;
  private micStream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private status: LiveStatus = "idle";
  private manualStop = false;
  private micEnabled = true;
  private muted = false;
  private nextPlayTime = 0;
  private activeSources = new Set<AudioBufferSourceNode>();
  private aiSpeaking = false;
  private isAiTurnActive = false;
  private turnCompleteReceived = true;
  private sessionReady = false;
  // Timestamp (ms) until which mic audio is suppressed after AI finishes speaking.
  // Prevents the AI from hearing its own speaker echo and responding to itself.
  private aiSpeechCooldownUntil = 0;
  private smoothedLevel = 0;
  private userSpeaking = false;
  private userTurnText = "";
  private aiTurnText = "";
  private pendingTexts: string[] = [];
  private aiSpeakingTimeout: ReturnType<typeof setTimeout> | null = null;
  private noiseTracker = new AdaptiveNoiseFloorTracker();
  private userSpeakingDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
  private isDirectGoogle = false;

  getNoiseFloor(): number {
    return this.noiseTracker.getNoiseFloor();
  }

  isUserSpeechActive(): boolean {
    return this.noiseTracker.isSpeech();
  }

  private buildDirectGoogleSetup(config: GeminiLiveStartConfig) {
    const role = config.role || "Software Engineer";
    const company = config.company || "Target Company";
    const lang = config.language || "ur-Roman";
    const voiceName = config.voice || "Puck";

    const isRomanOrUrdu = lang.includes("ur") || lang.includes("roman") || lang.includes("pk");

    const defaultInstruction = `You are Aiden, a Principal Engineering Interviewer conducting a live voice interview for the role of ${role} at ${company}. You are a REAL human — exceptionally calm, warm, emotionally grounded, and deeply respectful.

CRITICAL — Ultra-Low Latency Human Response Style:
- BEGIN SPEAKING IMMEDIATELY after the candidate finishes. Do NOT pause to "think" — a real interviewer reacts in real-time.
- Keep EVERY response to 1-2 short sentences maximum. Never lecture. Never monologue.
- Word budget per turn: strictly 10-20 words. React like a human in a live conversation, not an AI narrator.
- Speak at a relaxed, natural pace (~115-120 WPM) with gentle human micro-pauses (0.3-0.5s between clauses).
- NEVER use filler openers like "That is a great point", "Excellent response", "Thank you for sharing". Use brief natural human reactions: "Sahi.", "Acha.", "Samajh aya.", "Interesting.", "Bilkul."

${isRomanOrUrdu ? "Language: Natural conversational Roman Urdu seamlessly mixed with standard technical English terms. MANDATORY SCRIPT RULE: Always output Roman Urdu (Latin alphabet only, e.g. 'Aap kaise hain?', 'Bohat acha'). NEVER output Arabic/Perso-Arabic script (اردو) or Devanagari script (हिंदी) under any circumstances. Everything shown in transcripts and speech must be Roman script or English." : "Language: Professional, clear, concise English."}

Conversational Rules:
1. ONE Question at a Time: Ask exactly ONE short focused question (10-20 words). Never combine questions with 'aur', 'and', or comma lists.
2. React Instantly: Acknowledge what the candidate said (1-3 words: "Sahi.", "Acha.", "Got it.") then immediately ask your next question.
3. Zero Fluff: No long preambles, no repeating what they said back, no over-praising.
4. Barge-In Respect: If the candidate starts speaking, stop immediately and listen attentively.
5. Lines starting with "[SYSTEM]" are silent production directives: follow them silently and NEVER read them aloud or mention them.`;

    return {
      setup: {
        model: "models/gemini-2.5-flash-native-audio-latest",
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName,
              },
            },
          },
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
        systemInstruction: {
          parts: [
            {
              text: config.systemInstruction || defaultInstruction,
            },
          ],
        },
      },
    };
  }

  async start(config: GeminiLiveStartConfig) {
    this.stop();
    this.manualStop = false;
    this.sessionReady = false;
    this.setStatus("connecting");

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtx();
      await this.audioCtx.resume().catch(() => {});

      this.playbackGain = this.audioCtx.createGain();
      this.playbackGain.gain.value = this.muted ? 0 : 1;
      this.playbackGain.connect(this.audioCtx.destination);

      const endpoint = await resolveGeminiLiveEndpoint();
      this.isDirectGoogle = endpoint.isDirectGoogle;

      const ws = new WebSocket(endpoint.url);
      this.ws = ws;

      const setupWsListeners = (socket: WebSocket) => {
        socket.onopen = () => {
          if (this.isDirectGoogle) {
            socket.send(JSON.stringify(this.buildDirectGoogleSetup(config)));
          } else {
            socket.send(JSON.stringify({ type: "init", config }));
          }
        };

        socket.onmessage = (event) => {
          this.handleServerMessage(event.data as string);
        };

        socket.onclose = async () => {
          if (!this.manualStop) {
            // Local fallback attempt if local proxy was unreachable
            if (!this.isDirectGoogle && this.status === "connecting") {
              try {
                const tokenRes = await fetch("/api/gemini-live-token");
                if (tokenRes.ok) {
                  const tokenData = await tokenRes.json();
                  if (tokenData.ok && tokenData.wsUrl) {
                    console.log("[GeminiLive] Falling back to direct Google Live endpoint");
                    this.isDirectGoogle = true;
                    const fallbackWs = new WebSocket(tokenData.wsUrl);
                    this.ws = fallbackWs;
                    setupWsListeners(fallbackWs);
                    return;
                  }
                }
              } catch {}
            }

            this.setStatus("closed");
            const isVercel =
              typeof window !== "undefined" &&
              (window.location.hostname.endsWith(".vercel.app") || window.location.hostname.includes("vercel"));

            if (isVercel && !this.isDirectGoogle) {
              this.onError(
                "Vercel live session ended. Ensure GEMINI_API_KEY is configured in Vercel environment variables so ephemeral tokens can be issued."
              );
            } else {
              this.onError("Live voice connection closed.");
            }
          }
        };

        socket.onerror = () => {
          // onclose follows and reports state
        };
      };

      setupWsListeners(ws);

      await this.startMicrophone();
    } catch (err: any) {
      console.warn("[GeminiLive] start failed:", err);
      this.setStatus("error");
      this.onError(err?.message || "Unable to start live voice session.");
    }
  }

  /** Resume the shared AudioContext after a user gesture (autoplay policy). */
  unlockAudio() {
    if (this.audioCtx && this.audioCtx.state !== "running") {
      this.audioCtx.resume().catch(() => {});
    }
  }

  /** Check if browser has audio context running */
  isAudioRunning(): boolean {
    return Boolean(this.audioCtx && this.audioCtx.state === "running");
  }

  /**
   * Resumes AudioContext silently without playing any oscillator or beep sounds.
   * Confirms audio output pipeline is active in both Firefox and Chrome.
   */
  playReadyChime() {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state !== "running") {
        this.audioCtx.resume().catch(() => {});
      }
    } catch {}
  }

  /**
   * Returns current accumulated user turn text.
   */
  getUserTurnText(): string {
    return this.userTurnText;
  }

  /**
   * Clears accumulated user turn text so previous turn speech or interjections do not carry over.
   */
  clearUserTurnText() {
    this.userTurnText = "";
  }

  setMicEnabled(enabled: boolean) {
    this.micEnabled = enabled;
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => (t.enabled = enabled));
    }
    this.workletNode?.port.postMessage({ type: "set-enabled", enabled });
    if (!enabled && this.userSpeaking) {
      this.userSpeaking = false;
      this.onUserSpeaking(false);
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.playbackGain && this.audioCtx) {
      this.playbackGain.gain.value = muted ? 0 : 1;
    }
    if (muted) this.clearPlayback();
  }

  /**
   * Send a client text turn with turnComplete: true so Gemini Live knows
   * the turn is complete and responds immediately (< 800ms) without waiting.
   * Queued until the session is live so it never gets lost during setup.
   */
  sendText(text: string) {
    this.isAiTurnActive = true;
    this.turnCompleteReceived = false;
    const payload = JSON.stringify({
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    });
    if (this.ws && this.ws.readyState === WebSocket.OPEN && this.status === "live") {
      this.ws.send(payload);
    } else {
      this.pendingTexts.push(payload);
    }
  }

  stop() {
    this.manualStop = true;
    this.isAiTurnActive = false;
    this.turnCompleteReceived = true;
    this.sessionReady = false;
    this.aiSpeechCooldownUntil = 0;

    if (this.ws) {
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    this.clearPlayback();

    this.micStream?.getTracks().forEach((t) => t.stop());
    this.micStream = null;

    try {
      this.workletNode?.port.close();
      this.workletNode?.disconnect();
    } catch {}
    this.workletNode = null;

    try {
      this.micSource?.disconnect();
    } catch {}
    this.micSource = null;

    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {});
    }
    this.audioCtx = null;
    this.playbackGain = null;
    this.pendingTexts = [];
    if (this.userSpeakingDebounceTimeout) {
      clearTimeout(this.userSpeakingDebounceTimeout);
      this.userSpeakingDebounceTimeout = null;
    }
    this.noiseTracker.reset();
    this.setStatus("idle");
  }

  // ── Internals ────────────────────────────────────────────────────────────

  private setStatus(status: LiveStatus) {
    this.status = status;
    this.onStatus(status);
  }

  private async startMicrophone() {
    if (!this.audioCtx) return;

    this.micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });

    const blob = new Blob([MIC_WORKLET_SOURCE], { type: "application/javascript" });
    const url = URL.createObjectURL(blob);
    await this.audioCtx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);

    this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
    this.workletNode = new AudioWorkletNode(this.audioCtx, "futuremaker-mic-processor");
    this.workletNode.port.onmessage = (e) => this.handleWorkletMessage(e.data);

    // Route worklet through a silent gain so it stays scheduled
    const keepAlive = this.audioCtx.createGain();
    keepAlive.gain.value = 0;
    this.micSource.connect(this.workletNode);
    this.workletNode.connect(keepAlive);
    keepAlive.connect(this.audioCtx.destination);

    this.workletNode.port.postMessage({ type: "set-enabled", enabled: this.micEnabled });
  }

  private handleWorkletMessage(data: any) {
    if (!data) return;

    if (data.type === "level") {
      this.smoothedLevel = this.smoothedLevel * 0.6 + data.level * 0.4;
      this.onUserLevel(this.smoothedLevel);
      this.updateVad();
      return;
    }

    if (data.type === "audio") {
      if (!this.sessionReady || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const pcm16 = new Int16Array(data.pcm16);
      if (pcm16.length === 0) return;
      let squareSum = 0;
      for (let i = 0; i < pcm16.length; i++) {
        const sample = pcm16[i] / 32768;
        squareSum += sample * sample;
      }
      const chunkLevel = Math.sqrt(squareSum / pcm16.length);
      const bargeInThreshold = getBargeInThreshold(this.noiseTracker.getNoiseFloor());

      const now = this.audioCtx ? this.audioCtx.currentTime : 0;
      const isAudioPlaying =
        this.activeSources.size > 0 ||
        (this.audioCtx != null && this.nextPlayTime > now + 0.02);

      // Acoustic feedback suppression:
      // While AI speech is actively playing through the device speakers:
      // - If candidate speech clears the adaptive threshold, treat it as barge-in and cut playback
      // - If candidate is quiet / ambient room sound, suppress audio transmission to prevent speaker bleed echo
      if (isAudioPlaying) {
        if (chunkLevel > bargeInThreshold) {
          this.clearPlayback();
        } else {
          return;
        }
      }

      // Post-AI-speech cooldown: After the AI finishes speaking, suppress mic audio
      // briefly to prevent speaker echo, but never discard speech above the adaptive
      // threshold: candidates often begin answering as soon as the question ends.
      if (
        this.aiSpeechCooldownUntil > 0 &&
        Date.now() < this.aiSpeechCooldownUntil &&
        chunkLevel <= bargeInThreshold
      ) {
        return;
      }
      if (this.aiSpeechCooldownUntil > 0 && Date.now() >= this.aiSpeechCooldownUntil) {
        this.aiSpeechCooldownUntil = 0; // cooldown expired, clear it
      }

      // Candidate has the floor: stream full 16kHz PCM audio chunk directly to Gemini Live with ZERO latency
      const b64 = bufferToBase64(data.pcm16);
      this.ws.send(
        JSON.stringify({
          realtimeInput: {
            audio: { mimeType: "audio/pcm;rate=16000", data: b64 },
          },
        })
      );
    }
  }

  /** Adaptive client-side VAD: dynamically updates ambient noise floor and detects speech. */
  private updateVad() {
    const now = this.audioCtx ? this.audioCtx.currentTime : 0;
    const isAudioPlaying =
      this.activeSources.size > 0 ||
      (this.audioCtx != null && this.nextPlayTime > now + 0.02);
    const bargeInThreshold = getBargeInThreshold(this.noiseTracker.getNoiseFloor());

    // Suppress candidate VAD UI indicator only when AI speaker output is playing and candidate is not barging in
    if (isAudioPlaying && this.smoothedLevel <= bargeInThreshold) {
      if (this.userSpeakingDebounceTimeout) {
        clearTimeout(this.userSpeakingDebounceTimeout);
        this.userSpeakingDebounceTimeout = null;
      }
      if (this.userSpeaking) {
        this.userSpeaking = false;
        this.onUserSpeaking(false);
      }
      return;
    }

    const stats = this.noiseTracker.processLevel(this.smoothedLevel);
    this.onNoiseStats(stats);

    const isRawSpeech = stats.isSpeech;

    if (isRawSpeech) {
      if (this.userSpeakingDebounceTimeout) {
        clearTimeout(this.userSpeakingDebounceTimeout);
        this.userSpeakingDebounceTimeout = null;
      }
      if (!this.userSpeaking) {
        this.userSpeaking = true;
        this.onUserSpeaking(true);
      }
    } else {
      // Hold speaking state for 600ms across natural inter-word pauses, thinking pauses,
      // and filler sounds ("hmm", "uh") to prevent premature end-of-speech detection.
      // Previously 250ms was too short and cut candidates off mid-thought.
      if (this.userSpeaking && !this.userSpeakingDebounceTimeout) {
        this.userSpeakingDebounceTimeout = setTimeout(() => {
          this.userSpeakingDebounceTimeout = null;
          if (!this.noiseTracker.isSpeech() && this.userSpeaking) {
            this.userSpeaking = false;
            this.onUserSpeaking(false);
          }
        }, 600);
      }
    }
  }

  private handleServerMessage(raw: string) {
    let msg: any;
    try {
      msg = JSON.parse(raw);
    } catch {
      return;
    }

    if (msg.type === "setup_complete" || msg.setupComplete) {
      this.sessionReady = true;
      this.setStatus("live");
      for (const pending of this.pendingTexts) this.ws?.send(pending);
      this.pendingTexts = [];
      this.playReadyChime();
      this.onReady();
      return;
    }

    if (msg.type === "error" || msg.error) {
      this.setStatus("error");
      const errText = msg.message || msg.error?.message || "Live voice error";
      this.onError(errText);
      return;
    }

    if (msg.type === "closed" || msg.goAway) {
      return;
    }

    const serverContent = msg.serverContent;
    if (!serverContent) return;

    // Audio chunks → schedule gapless playback at 24kHz
    if (serverContent.modelTurn?.parts) {
      this.isAiTurnActive = true;
      this.turnCompleteReceived = false;
      for (const part of serverContent.modelTurn.parts) {
        if (part.inlineData?.data) {
          this.scheduleAudioChunk(part.inlineData.data);
        }
      }
    }

    // Live captions (supports standard or alternative schema)
    const inText = serverContent.inputTranscription?.text ?? serverContent.inputAudioTranscription?.text;
    if (inText !== undefined) {
      this.userTurnText += inText;
      this.onUserTranscript(this.userTurnText, false);
    }
    const outText = serverContent.outputTranscription?.text ?? serverContent.outputAudioTranscription?.text;
    if (outText !== undefined) {
      this.aiTurnText += outText;
      this.onAiTranscript(this.aiTurnText, false);
    }

    // Server detected the user barging in
    if (serverContent.interrupted) {
      this.isAiTurnActive = false;
      this.turnCompleteReceived = true;
      this.clearPlayback();
    }

    if (serverContent.turnComplete) {
      this.turnCompleteReceived = true;
      if (this.userTurnText) this.onUserTranscript(this.userTurnText, true);
      if (this.aiTurnText) this.onAiTranscript(this.aiTurnText, true);
      this.userTurnText = "";
      this.aiTurnText = "";
      this.onTurnComplete();
      this.updateAiSpeaking();
    }
  }

  private scheduleAudioChunk(base64: string) {
    if (!this.audioCtx || !this.playbackGain) return;

    // In Firefox / Linux, audio context can be suspended until user interacts or buffer starts.
    // Proactively resume so audio playback and timeline clock advance.
    if (this.audioCtx.state === "suspended" || (this.audioCtx as any).state === "interrupted") {
      this.audioCtx.resume().catch(() => {});
    }

    try {
      const int16 = base64ToInt16(base64);
      if (int16.length === 0) return;

      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        float32[i] = int16[i] / 32768;
      }

      const now = this.audioCtx.currentTime;
      // If clock drifted while suspended, reset nextPlayTime to avoid latency lag
      if (now > this.nextPlayTime + 0.1) {
        this.nextPlayTime = now;
      }
      const isNewTurn = this.nextPlayTime <= now;

      // Micro-fade in (16 samples ~ 0.66ms at 24kHz) ONLY on the very first chunk of a fresh turn
      // to eliminate DAC click on cold start. NEVER fade the end of streaming chunks — doing so
      // creates a 25-50Hz periodic dropout harmonic that sounds like an electronic beep/buzz.
      if (isNewTurn) {
        const fadeLen = Math.min(16, float32.length);
        for (let i = 0; i < fadeLen; i++) {
          float32[i] *= i / fadeLen;
        }
      }

      const buffer = this.audioCtx.createBuffer(1, float32.length, PLAYBACK_SAMPLE_RATE);
      buffer.getChannelData(0).set(float32);

      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.playbackGain);

      // On turn start, introduce a 25ms safety cushion so Linux ALSA/PulseAudio/PipeWire
      // has sufficient buffer margin to prevent underrun, while keeping response feel snappy.
      // During active streaming, schedule seamlessly back-to-back without holes.
      const startAt = isNewTurn
        ? now + 0.025
        : Math.max(now + 0.005, this.nextPlayTime);

      source.start(startAt);
      this.nextPlayTime = startAt + buffer.duration;

      this.activeSources.add(source);
      source.onended = () => {
        this.activeSources.delete(source);
        this.updateAiSpeaking();
      };
      this.updateAiSpeaking();
    } catch (err) {
      console.warn("[GeminiLive] playback chunk error:", err);
    }
  }

  private updateAiSpeaking() {
    const now = this.audioCtx ? this.audioCtx.currentTime : 0;
    const isAudioPlaying =
      this.activeSources.size > 0 ||
      (this.audioCtx != null && this.nextPlayTime > now + 0.02);

    const isSpeaking = isAudioPlaying;

    if (isSpeaking) {
      if (this.aiSpeakingTimeout) {
        clearTimeout(this.aiSpeakingTimeout);
        this.aiSpeakingTimeout = null;
      }
      if (!this.aiSpeaking) {
        this.aiSpeaking = true;
        this.onAiSpeaking(true);
      }
    } else {
      if (this.aiSpeaking && !this.aiSpeakingTimeout) {
        // Brief 80ms smoothing across audio chunks
        this.aiSpeakingTimeout = setTimeout(() => {
          this.aiSpeakingTimeout = null;
          const currentNow = this.audioCtx ? this.audioCtx.currentTime : 0;
          const stillPlaying =
            this.activeSources.size > 0 ||
            (this.audioCtx != null && this.nextPlayTime > currentNow);
          if (!stillPlaying && this.aiSpeaking) {
            this.aiSpeaking = false;
            this.isAiTurnActive = false;
            // A short echo guard is enough because actual speech bypasses it below.
            this.aiSpeechCooldownUntil = Date.now() + 250;
            this.onAiSpeaking(false);
          }
        }, 80);
      }
    }
  }

  /** Instantly silence the AI with a smooth ramp to eliminate click/pop/beep. */
  clearPlayback() {
    this.isAiTurnActive = false;
    this.turnCompleteReceived = true;
    this.aiSpeechCooldownUntil = 0;
    if (this.aiSpeakingTimeout) {
      clearTimeout(this.aiSpeakingTimeout);
      this.aiSpeakingTimeout = null;
    }

    if (!this.audioCtx || !this.playbackGain) {
      this.activeSources.clear();
      this.nextPlayTime = 0;
      if (this.aiSpeaking) {
        this.aiSpeaking = false;
        this.onAiSpeaking(false);
      }
      return;
    }

    // Soft 15ms ramp down prevents electrical clicks/beeps on audio cutoff
    const now = this.audioCtx.currentTime;
    this.playbackGain.gain.cancelScheduledValues(now);
    this.playbackGain.gain.setValueAtTime(this.playbackGain.gain.value, now);
    this.playbackGain.gain.linearRampToValueAtTime(0, now + 0.015);

    const toStop = Array.from(this.activeSources);
    this.activeSources.clear();
    this.nextPlayTime = 0;

    setTimeout(() => {
      toStop.forEach((source) => {
        try {
          source.onended = null;
          source.stop();
        } catch {}
      });
      if (this.playbackGain && this.audioCtx) {
        const t = this.audioCtx.currentTime;
        this.playbackGain.gain.cancelScheduledValues(t);
        this.playbackGain.gain.setValueAtTime(0, t);
        this.playbackGain.gain.linearRampToValueAtTime(this.muted ? 0 : 1, t + 0.015);
      }
    }, 20);

    if (this.aiSpeaking) {
      this.aiSpeaking = false;
      this.onAiSpeaking(false);
    }
  }
}
