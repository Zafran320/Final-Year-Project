import { spawn } from "child_process";
import type { Express, Request, Response } from "express";
import { getGeminiApiKey } from "./gemini";

// Curated 100% Male Neural Voice Catalog
export const MALE_VOICE_CATALOG: Record<string, { id: string; name: string; lang: string; accent: string; description: string }> = {
  "gemini-puck": {
    id: "gemini-puck",
    name: "Aiden (Puck Neural)",
    lang: "Multilingual / Roman Urdu / English",
    accent: "Executive Tech Hiring Manager Male",
    description: "Google Gemini Flagship Dynamic, polished male voice for technical interviews",
  },
  "gemini-fenrir": {
    id: "gemini-fenrir",
    name: "Aiden (Deep Neural)",
    lang: "Multilingual / Roman Urdu / English",
    accent: "Authoritative Studio Male",
    description: "Google Gemini Flagship Deep, highly emotive male voice with natural breath control",
  },
  "ur-PK-AsadNeural": {
    id: "ur-PK-AsadNeural",
    name: "Asad",
    lang: "Urdu / Roman Urdu / Regional",
    accent: "Pakistani Male",
    description: "Deep, authoritative Microsoft Neural voice for Urdu and Pakistani dialects",
  },
  "en-US-ChristopherNeural": {
    id: "en-US-ChristopherNeural",
    name: "Christopher",
    lang: "English (US)",
    accent: "Executive American Male",
    description: "Polished, commanding tone ideal for senior tech hiring manager",
  },
  "hi-IN-MadhurNeural": {
    id: "hi-IN-MadhurNeural",
    name: "Madhur",
    lang: "Hindi",
    accent: "Indian Male",
    description: "Clear, natural Hindi phrasing and technical diction",
  },
};

const DEFAULT_MALE_VOICE = "gemini-puck";

function pcmToWav(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  pcmBuffer.copy(buffer, 44);

  return buffer;
}

/**
 * Generate Studio-Grade Male Audio via Google Gemini TTS
 */
async function generateGeminiSpeech(text: string, voiceName = "Fenrir"): Promise<Buffer | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName, // 'Fenrir', 'Puck', 'Charon'
              },
            },
          },
        },
      }),
      signal: AbortSignal.timeout(9000),
    });

    if (!res.ok) {
      console.warn(`[Gemini TTS HTTP ${res.status}]`);
      return null;
    }

    const data = (await res.json()) as any;
    const base64Audio = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    const pcmBuf = Buffer.from(base64Audio, "base64");
    return pcmToWav(pcmBuf, 24000, 1, 16);
  } catch (err) {
    console.warn("[Gemini TTS Fallback]:", err);
    return null;
  }
}

/**
 * Generate Audio via Microsoft Edge Neural TTS (Buffered, Zero Stalls)
 */
function generateEdgeSpeech(
  text: string,
  voice: string,
  rate = "+0%",
  pitch = "-2Hz",
  volume = "+0%"
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const p = spawn("python3", [
      "-u",
      "-c",
      `
import sys, asyncio, edge_tts

async def main():
    text = sys.argv[1]
    voice = sys.argv[2]
    rate = sys.argv[3]
    pitch = sys.argv[4]
    volume = sys.argv[5]
    
    communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate, pitch=pitch, volume=volume)
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            sys.stdout.buffer.write(chunk["data"])
            sys.stdout.buffer.flush()

asyncio.run(main())
      `,
      text,
      voice,
      rate,
      pitch,
      volume,
    ]);

    const chunks: Buffer[] = [];
    let errOutput = "";

    p.stdout.on("data", (d: Buffer) => chunks.push(d));
    p.stderr.on("data", (e: Buffer) => (errOutput += e.toString()));

    p.on("close", (code) => {
      if (code !== 0 && chunks.length === 0) {
        reject(new Error(`Edge-TTS failed with code ${code}: ${errOutput}`));
      } else {
        resolve(Buffer.concat(chunks));
      }
    });
  });
}

function resolveEdgeVoice(text: string, language?: string, explicitVoice?: string): string {
  if (explicitVoice && MALE_VOICE_CATALOG[explicitVoice] && explicitVoice.includes("Neural")) {
    return explicitVoice;
  }

  if (language) {
    const l = language.toLowerCase();
    if (l.includes("roman") || l.includes("ur")) return "ur-PK-AsadNeural";
    if (l.includes("hi")) return "hi-IN-MadhurNeural";
    if (l.includes("en-gb")) return "en-GB-RyanNeural";
    if (l.includes("en")) return "en-US-ChristopherNeural";
    if (l.includes("ps") || l.includes("sd") || l.includes("pa") || l.includes("bal") || l.includes("skr")) {
      return "ur-PK-AsadNeural";
    }
  }

  if (/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text)) {
    return "ur-PK-AsadNeural";
  }
  if (/[\u0900-\u097F]/.test(text)) {
    return "hi-IN-MadhurNeural";
  }

  return "ur-PK-AsadNeural";
}

export function registerTtsRoutes(app: Express) {
  // ─── 1. Neural Male TTS Generation Endpoint ─────────────────────────────────
  app.post("/api/generate-speech", async (req: Request, res: Response) => {
    try {
      const {
        text,
        language,
        voice,
        rate = "+0%",
        pitch = "-2Hz",
        volume = "+0%",
      } = req.body;

      if (!text || typeof text !== "string" || !text.trim()) {
        res.status(400).json({ error: "Text is required and cannot be empty." });
        return;
      }

      const speechText = text.trim();

      // Step 1: Try Flagship Gemini 2.5 Flash Neural Male TTS (Puck / Aiden)
      let wavBuffer: Buffer | null = null;
      if (!voice || voice === "gemini-puck" || voice === "gemini-fenrir") {
        const geminiVoice = voice === "gemini-fenrir" ? "Fenrir" : "Puck";
        wavBuffer = await generateGeminiSpeech(speechText, geminiVoice);
        if (wavBuffer && wavBuffer.length > 1000) {
          res.setHeader("Content-Type", "audio/wav");
          res.setHeader("Content-Length", wavBuffer.length.toString());
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("X-Voice-Engine", "gemini-neural-male");
          res.setHeader("X-Voice-Used", geminiVoice);
          res.status(200).send(wavBuffer);
          return;
        }
      }

      // Step 2: High-Speed Edge-TTS Fallback (Asad / Christopher / Madhur)
      try {
        const edgeVoice = resolveEdgeVoice(speechText, language, voice);
        const mp3Buffer = await generateEdgeSpeech(speechText, edgeVoice, rate, pitch, volume);

        res.setHeader("Content-Type", "audio/mpeg");
        res.setHeader("Content-Length", mp3Buffer.length.toString());
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("X-Voice-Engine", "edge-tts");
        res.setHeader("X-Voice-Used", edgeVoice);
        res.status(200).send(mp3Buffer);
        return;
      } catch (edgeErr) {
        console.warn("[TTS] Edge-TTS failed, retrying Gemini Puck:", edgeErr);
        const fallbackWav = await generateGeminiSpeech(speechText, "Puck");
        if (fallbackWav && fallbackWav.length > 1000) {
          res.setHeader("Content-Type", "audio/wav");
          res.setHeader("Content-Length", fallbackWav.length.toString());
          res.setHeader("Cache-Control", "no-cache");
          res.setHeader("X-Voice-Engine", "gemini-neural-male");
          res.setHeader("X-Voice-Used", "Puck");
          res.status(200).send(fallbackWav);
          return;
        }
        throw edgeErr;
      }
    } catch (err: any) {
      console.error("[TTS Server Error]:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to generate neural male speech" });
      }
    }
  });

  // ─── 2. Male Voice Catalog ────────────────────────────────────────────────
  app.get("/api/voices", (_req: Request, res: Response) => {
    res.json({
      status: "online",
      default_voice: DEFAULT_MALE_VOICE,
      male_voices: MALE_VOICE_CATALOG,
    });
  });
}

