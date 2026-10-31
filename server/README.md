# Server — 3-Layer Architecture

FutureMaker AI uses a clean **3-layer architecture** on the server side.

```
server/
├── infrastructure/  ← Framework core: env, auth middleware, tRPC setup, SDK, Vite
├── controllers/     ← Presentation: plain REST route handlers
├── api/             ← Presentation: tRPC routers (typed API contract)
├── domain/          ← Business Logic: AI, scraping, company prep, roadmap, TTS
├── repository/      ← Data Access: database, storage, Supabase client
└── routers.ts       ← tRPC aggregator (assembles all api/ routers)
```

## Layer Dependency Rules

```
controllers/ & api/  →  domain/  →  repository/
        ↓                  ↓
   infrastructure/    infrastructure/
```

- **`infrastructure/`** — Framework plumbing. No business logic. Used by all layers.
- **`repository/`** — Data access only. No HTTP or business logic.
- **`domain/`** — Business logic. Imports from `repository/` and `infrastructure/`. Never imports from controllers or api.
- **`api/` & `controllers/`** — HTTP handlers only. Delegate to `domain/` and `repository/`.

## Entry Point

`server/infrastructure/index.ts` — starts Express, registers all routes, handles Vite dev/prod.
