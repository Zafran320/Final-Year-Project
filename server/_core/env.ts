import { randomBytes } from "node:crypto";

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? process.env.SUPABASE_DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? "",
  supabaseUrl: process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "",
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  // Forge (commercial LLM gateway) — falls back to Gemini OpenAI-compatible endpoint
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
};

const MIN_SESSION_SECRET_LENGTH = 32;
let devSessionSecret: string | null = null;

/**
 * Returns the secret used to sign session cookies. Production refuses to run with a
 * missing or short JWT_SECRET; development falls back to a random per-process secret
 * (sessions reset on restart) so a forgotten env var never becomes a guessable key.
 */
export function resolveSessionSecret(
  secret: string = ENV.cookieSecret,
  isProduction: boolean = ENV.isProduction
): string {
  if (secret.length >= MIN_SESSION_SECRET_LENGTH) return secret;
  if (isProduction) {
    throw new Error(`JWT_SECRET must be set to at least ${MIN_SESSION_SECRET_LENGTH} characters in production.`);
  }
  if (!devSessionSecret) {
    devSessionSecret = randomBytes(32).toString("hex");
    console.warn("[Auth] JWT_SECRET is missing or shorter than 32 characters; using a random development secret.");
  }
  return devSessionSecret;
}
