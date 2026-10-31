# Layer: Routes / Presentation (Server)

This folder contains **REST route handlers** for the FutureMaker AI server.

The tRPC routers live in `../api/` (Hono/Express tRPC adapter).  
Plain REST endpoints (non-tRPC) live here.

## Files

| File | Responsibility |
|------|---------------|
| `roadmapRest.ts` | REST endpoints: `POST /api/generate-roadmap`, `GET /api/interview-sessions/latest` |

## Architecture Rules

- Routes depend on **services** (`../domain/`) and **data** (`../repository/`).
- Routes must **not** contain business logic — delegate to services.
- Authentication is handled via `../infrastructure/sdk.ts`.
