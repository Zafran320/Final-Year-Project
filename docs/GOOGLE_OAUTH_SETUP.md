# Google Sign-In Activation Guide

FutureMaker AI contains a **configuration-ready** Google OAuth flow. The visible Google button remains transparent about its state: it only starts Google authentication after the required server-side environment variables are present. No email, password, Client Secret, token, or testing credential is hardcoded in the client, database seed, or source repository.

## Create the Google Cloud OAuth client

Create or select a Google Cloud project, configure the OAuth consent screen, and create an OAuth 2.0 client of type **Web application**. Register the exact callback URL of the deployed FutureMaker AI app under **Authorized redirect URIs**. Google’s web-server OAuth guidance requires the callback URI in the request to exactly match a URI registered on the OAuth client; a mismatch causes a redirect error. [1]

| Environment variable | Where it comes from | Visibility |
|---|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` | Google Cloud Console → Credentials → OAuth 2.0 Client IDs | Server environment only. It is never returned by the application status API. |
| `GOOGLE_OAUTH_CLIENT_SECRET` | The secret shown when creating the Google OAuth client | Server environment only. Do not put this in frontend code, a VITE variable, chat, or source control. |
| `GOOGLE_OAUTH_REDIRECT_URI` | The exact deployed callback registered in Google Cloud | Server environment only. It must be `https://<your-domain>/api/auth/google/callback`. |

> Google recommends keeping the client-secret material outside publicly accessible locations and outside the source tree. [1]

## Add the values securely

In FutureMaker AI’s project settings, add the three values as private server environment variables. Do **not** edit or commit `.env` files. The project’s secure settings flow is the only supported place for the real Client ID and Client Secret.

For the current preview environment, register this URL if the preview domain is unchanged:

```text
https://3000-i7a89wtsq4gnozbigzfqu-bd0ef212.us5.manus.computer/api/auth/google/callback
```

After deployment, add the deployed custom or Manus domain callback too. Google requires exact scheme, host, path, case, and trailing-slash matching. [1]

## What happens when enabled

When all three server variables exist, the **Continue with Google** button sends the browser to the Google authorization endpoint with the minimum identity scopes: `openid`, `email`, and `profile`. The server creates a one-time CSRF state cookie, verifies the returned state in the callback, exchanges the code server-side, verifies the Google ID token, upserts only non-sensitive profile metadata, and issues the existing HTTP-only FutureMaker application session. No access or refresh token is stored in the browser.

## Local and hackathon testing

Use a dedicated Google test account that you control. Do not distribute a personal password to team members, place it in a Git repository, or hardcode it into a webpage. If a password was shared in an insecure channel, rotate it before using the account in any live system.

## References

[1] [Google for Developers — Using OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
