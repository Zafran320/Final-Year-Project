import { describe, expect, it } from "vitest";
import { getGoogleOAuthConfig } from "./googleAuth";

describe("Google OAuth configuration guard", () => {
  it("stays disabled unless all server-only Google OAuth values are present", () => {
    expect(getGoogleOAuthConfig({ GOOGLE_OAUTH_CLIENT_ID: "id" })).toBeNull();
    expect(getGoogleOAuthConfig({
      GOOGLE_OAUTH_CLIENT_ID: "id",
      GOOGLE_OAUTH_CLIENT_SECRET: "secret",
      GOOGLE_OAUTH_REDIRECT_URI: "https://example.com/api/auth/google/callback",
    })).toEqual({
      clientId: "id",
      clientSecret: "secret",
      redirectUri: "https://example.com/api/auth/google/callback",
    });
  });
});
