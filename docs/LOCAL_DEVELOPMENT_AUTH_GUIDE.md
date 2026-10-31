# FutureMaker AI — Local Backend and Authentication Guide

## What is currently running

`pnpm dev` starts one full-stack development server. It runs the Express backend and serves the Vite/React client from the same origin, normally `http://localhost:3000`. The backend registers the managed OAuth callback, Google OAuth routes, tRPC under `/api/trpc`, and the storage proxy before serving the application.

| Layer | Current status | Local behavior |
|---|---|---|
| React/Vite interface | Active | Served by the same Express development server. |
| Express + tRPC API | Active | Available at `/api/trpc`; unauthenticated `auth.me` resolves as no user. |
| Managed Manus OAuth | Implemented | Login/signup handoff works only when the local callback origin is accepted by the managed OAuth application. |
| MySQL/Drizzle user persistence | Implemented | Uses `DATABASE_URL` when supplied; OAuth upserts the real provider identity in `users`. |
| Google OAuth | Implemented but disabled | The status endpoint currently reports `enabled: false` until secure Google settings are supplied. |
| AI coaching generation | Not connected | The preparation workspace honestly shows this as unavailable until a secure coaching backend is added. |

## Why an account can appear in the hosted preview

The hosted preview and `localhost` are different browser origins. A signed-in account shown in the hosted preview comes from the managed session cookie for that preview origin. That cookie is not shared with `http://localhost:3000`, so seeing an account in the preview does **not** mean local development is already authenticated.

## Run the project locally

```bash
cd /path/to/futuremaker-ai
pnpm install
pnpm dev
```

Open `http://localhost:3000`. The command starts Express and Vite together; do not run a separate Vite command for this project.

## Login and signup flow

The product has two branded entry pages: `/login` and `/signup`.

| Product action | Managed OAuth behavior |
|---|---|
| **Continue securely** on `/login` | Calls `startLogin("signIn")` and opens the managed provider with a sign-in intent. |
| **Create account securely** on `/signup` | Calls `startLogin("signUp")` and opens the same provider with an account-creation intent. |
| Provider completes | The provider returns to `/api/oauth/callback` with a code and CSRF-bound state. |
| Server callback completes | The server verifies state, upserts the provider user when the database is configured, and sets a signed HTTP-only application session cookie. |
| Return to FutureMaker | The user is redirected to `/`; protected screens can then read the real session through `auth.me`. |

FutureMaker never accepts, stores, or hardcodes a password. The managed provider owns credential collection. The browser session is stored in an HTTP-only cookie rather than application JavaScript storage.

## Localhost requirement for real sign-in

The login helper builds the callback from the current origin. When you run on the normal local port, it requests this callback:

```text
http://localhost:3000/api/oauth/callback
```

For a **real** login/signup round trip on localhost, this exact callback must be allowed in the managed OAuth application's redirect configuration. If it is not registered, the provider will reject the redirect or will not return to the local app. This approval is controlled by the OAuth application configuration, not by a password or value committed in this repository.

## Safe local test checklist

1. Start the project with `pnpm dev` and open `http://localhost:3000` in a private/incognito browser window.
2. Confirm the public home page loads without an account session.
3. Open `http://localhost:3000/?screen=intake`; it should redirect to `/login` because the route is protected.
4. Open `/signup` or `/login`, then select the managed primary action. Complete the provider flow only if the localhost callback has been allowed.
5. After return, confirm that the protected intake/session screen opens and that **Sign out** removes access to protected screens.
6. If the provider cannot return to localhost, continue testing UI, forms, and protected redirects locally; test the real provider round trip on the hosted project origin until localhost is approved.

## Google sign-in

Google sign-in is intentionally unavailable until the project owner adds all three secure server settings:

```text
GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI
```

For local Google testing, the redirect URI must exactly match the local callback registered in Google Cloud, for example `http://localhost:3000/api/auth/google/callback`. Add values only through secure project settings; do not commit an `.env` file or expose a client secret in the browser.
