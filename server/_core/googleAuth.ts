/* Secure Google OAuth boundary: client secrets and code exchange remain server-only; the browser receives only a signed FutureMaker session. */
import { randomBytes } from "crypto";
import { OAuth2Client } from "google-auth-library";
import type { Express, Request, Response } from "express";
import { parse as parseCookieHeader } from "cookie";
import * as db from "../db";
import { ONE_YEAR_MS } from "../../shared/const";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

const GOOGLE_STATE_COOKIE = "__Host-google_oauth_state";
const GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_SCOPES = "openid email profile";

export type GoogleOAuthConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export function getGoogleOAuthConfig(env: NodeJS.ProcessEnv = process.env): GoogleOAuthConfig | null {
  const clientId = env.GOOGLE_OAUTH_CLIENT_ID?.trim() ?? "";
  const clientSecret = env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() ?? "";
  const redirectUri = env.GOOGLE_OAUTH_REDIRECT_URI?.trim() ?? "";
  return clientId && clientSecret && redirectUri ? { clientId, clientSecret, redirectUri } : null;
}

function safeLoginRedirect(res: Response, reason: "google-unavailable" | "google-failed") {
  res.redirect(302, `/login?error=${reason}`);
}

export function registerGoogleAuthRoutes(app: Express) {
  app.get("/api/auth/google/status", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ enabled: Boolean(getGoogleOAuthConfig()) });
  });

  app.get("/api/auth/google/start", (req: Request, res: Response) => {
    const config = getGoogleOAuthConfig();
    if (!config) {
      safeLoginRedirect(res, "google-unavailable");
      return;
    }

    const state = randomBytes(32).toString("hex");
    const options = getSessionCookieOptions(req);
    res.cookie(GOOGLE_STATE_COOKIE, state, { ...options, maxAge: 10 * 60 * 1000 });

    const authorizationUrl = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
    authorizationUrl.searchParams.set("client_id", config.clientId);
    authorizationUrl.searchParams.set("redirect_uri", config.redirectUri);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("scope", GOOGLE_SCOPES);
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("prompt", "select_account");
    res.redirect(302, authorizationUrl.toString());
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const config = getGoogleOAuthConfig();
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const state = typeof req.query.state === "string" ? req.query.state : "";
    const expectedState = parseCookieHeader(req.headers.cookie ?? "")[GOOGLE_STATE_COOKIE];
    res.clearCookie(GOOGLE_STATE_COOKIE, { path: "/", secure: true, sameSite: "none" });

    if (!config || !code || !state || !expectedState || state !== expectedState) {
      safeLoginRedirect(res, config ? "google-failed" : "google-unavailable");
      return;
    }

    try {
      const tokenResponse = await fetch(GOOGLE_TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) throw new Error("Google token exchange failed");
      const tokens = (await tokenResponse.json()) as { id_token?: string };
      if (!tokens.id_token) throw new Error("Google did not return an ID token");

      const client = new OAuth2Client(config.clientId);
      const ticket = await client.verifyIdToken({ idToken: tokens.id_token, audience: config.clientId });
      const profile = ticket.getPayload();
      if (!profile?.sub || !profile.email || profile.email_verified !== true) throw new Error("Google profile verification failed");

      const openId = `google:${profile.sub}`;
      await db.upsertUser({
        openId,
        name: typeof profile.name === "string" ? profile.name : null,
        email: profile.email,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(openId, { name: typeof profile.name === "string" ? profile.name : "", expiresInMs: ONE_YEAR_MS });
      res.cookie("app_session_id", sessionToken, { ...getSessionCookieOptions(req), maxAge: ONE_YEAR_MS });
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Google OAuth] Callback failed", error);
      safeLoginRedirect(res, "google-failed");
    }
  });
}
