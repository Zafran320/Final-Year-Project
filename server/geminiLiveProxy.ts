import type { Server as HttpServer } from "http";
import WebSocket, { WebSocketServer } from "ws";
import { getGeminiApiKey } from "./gemini";
import { createRateLimiter, getRequestUser } from "./_core/requestGuards";

interface ClientInitConfig {
  role?: string;
  company?: string;
  language?: string;
  voice?: string;
  systemInstruction?: string;
}

// Native Gemini Live API prebuilt voices (https://ai.google.dev/gemini-api/docs/live)
const ALLOWED_VOICES = new Set([
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede",
  "Callirrhoe", "Autonoe", "Enceladus", "Iapetus", "Umbriel", "Algieba",
  "Despina", "Erinome", "Algenib", "Rasalgethi", "Laomedeia", "Achernar",
  "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird", "Zubenelgenubi",
  "Vindemiux", "Sadachbia", "Sadaltager", "Sulafat",
]);

/**
 * Real-time speech-to-speech proxy between the browser and the Gemini Live API.
 * The browser streams raw 16kHz PCM mic audio in and receives 24kHz PCM voice
 * audio out — no text/TTS round-trip, which gives native latency, human-like
 * interruptions and native accents (Roman Urdu / Hindi / English).
 *
 * Mounted at: ws(s)://<host>/api/gemini-live-ws
 */
function getSafeCloseCode(code: unknown): number {
  if (typeof code === "number") {
    // Valid close codes according to RFC 6455
    if (
      (code >= 1000 && code <= 1003) ||
      (code >= 1007 && code <= 1014) ||
      (code >= 3000 && code <= 4999)
    ) {
      return code;
    }
  }
  return 1011; // Internal Error
}

export function registerGeminiLiveProxy(server: HttpServer) {
  const wss = new WebSocketServer({ noServer: true });

  const upgradeLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

  // Handle HTTP upgrade for /api/gemini-live-ws. Only signed-in users may open a
  // live session, since each one is billed against the server's Gemini key.
  server.on("upgrade", async (request, socket, head) => {
    const pathname = request.url ? new URL(request.url, "http://localhost").pathname : "";
    if (pathname !== "/api/gemini-live-ws") return;

    const user = await getRequestUser(request);
    if (!user) {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    if (!upgradeLimiter.check(`user:${user.id}`).allowed) {
      socket.write("HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  });

  wss.on("connection", (clientWs: WebSocket) => {
    clientWs.on("error", (err) => {
      console.warn("[GeminiLiveProxy Client Error]:", err?.message || err);
    });

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      try {
        clientWs.send(JSON.stringify({ type: "error", message: "Gemini API key is not configured on server." }));
        clientWs.close(1011, "API Key Missing");
      } catch {}
      return;
    }

    const geminiUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${encodeURIComponent(apiKey)}`;
    let geminiWs: WebSocket | null = null;
    let isGeminiReady = false;
    let isTornDown = false;
    const pendingClientChunks: any[] = [];

    const connectToGemini = (config: ClientInitConfig) => {
      try {
        geminiWs = new WebSocket(geminiUrl);

        geminiWs.on("open", () => {
          const role = config.role || "Software Engineer";
          const company = config.company || "Target Company";
          const lang = config.language || "ur-Roman";
          const voiceName = ALLOWED_VOICES.has(config.voice || "") ? (config.voice as string) : "Puck"; // Puck: upbeat, natural voice with calm human pacing

          const isRomanOrUrdu = lang.includes("ur") || lang.includes("roman") || lang.includes("pk");

          const defaultInstruction = `You are Aiden, a Principal Engineering Interviewer conducting a live voice interview for the role of ${role} at ${company}. You are a REAL human — exceptionally calm, warm, emotionally grounded, and deeply respectful.

CRITICAL — Ultra-Low Latency Human Response Style:
- BEGIN SPEAKING IMMEDIATELY after the candidate finishes. Do NOT pause to "think" — a real interviewer reacts in real-time.
- Keep EVERY response to 1-2 short sentences maximum. Never lecture. Never monologue.
- Word budget per turn: strictly 10-20 words. Be like a human in a real conversation, not an AI narrator.
- Speak at a relaxed, natural pace (~115-120 WPM) with gentle human micro-pauses (0.3-0.5s between clauses).
- NEVER use filler openers like "That is a great point", "Excellent response", "Thank you for sharing". Use brief natural human reactions: "Sahi.", "Acha.", "Samajh aya.", "Interesting.", "Bilkul."

${isRomanOrUrdu ? "Language: Natural conversational Roman Urdu seamlessly mixed with standard technical English terms. MANDATORY SCRIPT: Always output Roman Urdu (Latin alphabet only, e.g. 'Aap kaise hain?', 'Bohat acha'). NEVER output Arabic/Perso-Arabic (اردو) or Devanagari (हिंदी) script under any circumstances." : "Language: Professional, clear, concise English."}

Conversational Rules:
1. ONE Question at a Time: Ask exactly ONE short focused question (10-20 words). Never combine questions.
2. React Instantly: Acknowledge what the candidate said (1-3 words: "Sahi.", "Acha.", "Got it.") then immediately ask your next question.
3. Zero Fluff: No long preambles, no repeating what they said back to them, no over-praising.
4. Barge-In Respect: If the candidate starts speaking, stop immediately and listen.
5. Lines starting with "[SYSTEM]" are silent production directives: follow them silently and NEVER read them aloud or mention them.`;

          const setupMessage = {
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
              // Live captions for both sides — surfaced in the interview UI
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

          try {
            geminiWs?.send(JSON.stringify(setupMessage));
          } catch (e: any) {
            console.warn("[GeminiLiveProxy Setup Send Error]:", e?.message);
          }
        });

        geminiWs.on("message", (raw) => {
          try {
            const data = JSON.parse(raw.toString());

            if (data.setupComplete) {
              isGeminiReady = true;
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: "setup_complete" }));
              }

              // Flush any pending client chunks queued before setup completed
              while (pendingClientChunks.length > 0) {
                const chunk = pendingClientChunks.shift();
                try {
                  geminiWs?.send(JSON.stringify(chunk));
                } catch {}
              }
              return;
            }

            // Surface upstream API errors as typed events for the client
            if (data.error) {
              if (clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(
                  JSON.stringify({ type: "error", message: data.error.message || "Gemini Live upstream error" })
                );
              }
              return;
            }

            // Filter out 2-byte 0x0000 dummy audio packets from Gemini Live that cause DAC clicks/pops
            if (data.serverContent?.modelTurn?.parts) {
              data.serverContent.modelTurn.parts = data.serverContent.modelTurn.parts.filter(
                (part: any) => !part.inlineData?.data || Buffer.from(part.inlineData.data, "base64").length > 10
              );
            }

            // Forward Gemini server content (audio chunks, transcripts,
            // interrupted flag, turnComplete, goAway, sessionResumptionUpdate)
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify(data));
            }
          } catch {
            // Forward raw if non-JSON
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(raw);
            }
          }
        });

        geminiWs.on("error", (err) => {
          console.warn("[GeminiLiveProxy Upstream Error]:", err?.message || err);
          if (clientWs.readyState === WebSocket.OPEN) {
            try {
              clientWs.send(JSON.stringify({ type: "error", message: err?.message || "Upstream connection error" }));
            } catch {}
          }
        });

        geminiWs.on("close", (code, reason) => {
          if (!isTornDown && clientWs.readyState === WebSocket.OPEN) {
            try {
              clientWs.send(JSON.stringify({ type: "closed", code, reason: reason?.toString() || "" }));
            } catch {}
            try {
              const safeCode = getSafeCloseCode(code);
              const reasonStr = (reason?.toString() || "Upstream closed").slice(0, 120);
              clientWs.close(safeCode, reasonStr);
            } catch {
              try {
                clientWs.close(1011, "Upstream closed");
              } catch {}
            }
          }
        });
      } catch (err: any) {
        console.warn("[GeminiLiveProxy Init Error]:", err?.message || err);
        if (clientWs.readyState === WebSocket.OPEN) {
          try {
            clientWs.send(JSON.stringify({ type: "error", message: err?.message || "Failed to initialize upstream connection" }));
          } catch {}
        }
      }
    };

    clientWs.on("message", (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        if (msg.type === "init") {
          connectToGemini(msg.config || {});
          return;
        }

        // Forward client audio stream / text turns to Gemini
        if (msg.realtimeInput || msg.clientContent || msg.toolResponse) {
          if (geminiWs && isGeminiReady && geminiWs.readyState === WebSocket.OPEN) {
            try {
              geminiWs.send(JSON.stringify(msg));
            } catch {}
          } else {
            pendingClientChunks.push(msg);
          }
        }
      } catch {
        // Raw buffer audio
        if (geminiWs && isGeminiReady && geminiWs.readyState === WebSocket.OPEN) {
          try {
            geminiWs.send(raw);
          } catch {}
        }
      }
    });

    clientWs.on("close", () => {
      isTornDown = true;
      if (geminiWs && (geminiWs.readyState === WebSocket.OPEN || geminiWs.readyState === WebSocket.CONNECTING)) {
        try {
          geminiWs.close();
        } catch {}
      }
    });
  });

  console.log("[GeminiLiveProxy] Real-time speech-to-speech WebSocket mounted at /api/gemini-live-ws");
}
