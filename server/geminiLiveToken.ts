import { getGeminiApiKey } from "./gemini";

export interface GeminiLiveTokenResult {
  ok: boolean;
  status?: number;
  token?: string;
  wsUrl?: string;
  model?: string;
  error?: string;
}

export const GEMINI_LIVE_MODEL = "models/gemini-2.5-flash-native-audio-latest";

/**
 * Issues an ephemeral auth token from Google's Generative Language API.
 * This enables the client (e.g. browser on Vercel) to connect directly to
 * wss://generativelanguage.googleapis.com/... without routing audio through
 * a persistent server proxy or exposing the master GEMINI_API_KEY.
 */
export async function createGeminiLiveToken(): Promise<GeminiLiveTokenResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      error: "GEMINI_API_KEY is not configured on the server.",
    };
  }

  try {
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/auth_tokens", {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        uses: 20, // Sufficient for live session establishment and transient reconnections
      }),
    });

    const data: any = await response.json();

    if (!response.ok || !data?.name) {
      const errMsg = data?.error?.message || `Google API returned status ${response.status}`;
      console.warn("[GeminiLiveToken] Failed to issue token from Google:", errMsg);
      return {
        ok: false,
        status: response.status || 502,
        error: `Failed to issue Gemini Live ephemeral token: ${errMsg}`,
      };
    }

    const token = data.name;
    const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(token)}`;

    return {
      ok: true,
      status: 200,
      token,
      wsUrl,
      model: GEMINI_LIVE_MODEL,
    };
  } catch (err: any) {
    console.error("[GeminiLiveToken] Unexpected error calling Google auth_tokens:", err);
    return {
      ok: false,
      status: 500,
      error: err?.message || "Internal server error while provisioning live token.",
    };
  }
}
